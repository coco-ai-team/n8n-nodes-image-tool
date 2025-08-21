import type { IExecuteFunctions, INodeCredentialDescription, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import type { OperationHandler } from '../utils/types';
import { downloadImage } from '../utils';
import OpenAI from 'openai';
import sharp from 'sharp';

export type Image2ImageOptions = {
	apiKey: string
	model: string
	size: string
}

export default class Image2ImageOperation implements OperationHandler {
	Name(): string {
		return 'Image to Image'
	}

	Description(): string {
		return "Generate an image from a prompt"
	}

	credential(): INodeCredentialDescription[] {
		return [
			{
				name: 'openAIApi',
				required: true,
				displayOptions: {
					show: {
						operation: [this.Operation()],
					},
				},
			}
		]
	}

	Operation(): string {
		return 'image2image'
	}

	async execute(executeFunctions: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnItems: INodeExecutionData[] = []

		// step 1: parse parameters here
		let input: string | Buffer
		const binaryFile = executeFunctions.getNodeParameter('binaryFile', 0) as boolean
		if (binaryFile) {
			const inputBinaryField = executeFunctions.getNodeParameter('inputBinaryField', 0) as string
			input = await executeFunctions.helpers.getBinaryDataBuffer(0, inputBinaryField);
		} else {
			input = executeFunctions.getNodeParameter('url', 0) as string
		}
		const prompt = executeFunctions.getNodeParameter('prompt', 0) as string
		const openAIApi = await executeFunctions.getCredentials('openAIApi') as {
			openAIApiKey: string
		}
		const model = executeFunctions.getNodeParameter('model', 0) as string
		const size = executeFunctions.getNodeParameter('size', 0) as string

		// step 2: do something here
		const image = await generateImage(input, prompt, {
			apiKey: openAIApi.openAIApiKey,
			model,
			size,
		})

		// step 3: save data to returnItems
		const data = await executeFunctions.helpers.prepareBinaryData(image)
		returnItems.push({
			json: {},
			binary: { data }
		})

		return [returnItems]
	}
	properties(): INodeProperties[] {
		return [
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				default: 'gpt-image-1',
				required: true,
				options: [
					{ name: 'gpt-image-1', value: 'gpt-image-1' },
					{ name: 'dall-e-2', value: 'dall-e-2' },
				],
				displayOptions: {
					show: {
						operation: [this.Operation()],
					},
				},
			},
			// Size options for dall-e-2
			{
				displayName: 'Size',
				name: 'size',
				type: 'options',
				default: "1024x1024",
				required: true,
				options: [
					{ name: '256x256', value: '256x256' },
					{ name: '512x512', value: '512x512' },
					{ name: '1024x1024', value: '1024x1024' },
				],
				displayOptions: {
					show: {
						operation: [this.Operation()],
						model: ['dall-e-2'],
					},
				},
			},
			// Size options for gpt-image-1
			{
				displayName: 'Size',
				name: 'size',
				type: 'options',
				default: "1024x1024",
				required: true,
				options: [
					{ name: '1024x1024', value: '1024x1024' },
					{ name: '1024x1536', value: '1024x1536' },
					{ name: '1536x1024', value: '1536x1024' },
					{ name: 'Auto', value: 'auto' },
				],
				displayOptions: {
					show: {
						operation: [this.Operation()],
						model: ['gpt-image-1'],
					},
				},
			},
			{
				displayName: 'Text Input',
				name: 'prompt',
				type: 'string',
				default: "",
				required: true,
				placeholder: "",
				typeOptions: {
					rows: 10,
				},
				displayOptions: {
					show: {
						operation: [this.Operation()],
					},
				},
			},
			{
				displayName: 'Binary File',
				name: 'binaryFile',
				type: 'boolean',
				default: false,
				required: true,
				description: "Whether the image to perform operation should be taken from binary field",
				displayOptions: {
					show: {
						operation: [this.Operation()],
					},
				},
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: "",
				required: true,
				placeholder: "e.g. https://example.com/image.jpg",
				description: "URL of the image to perform operation",
				displayOptions: {
					show: {
						operation: [this.Operation()],
						binaryFile: [false],
					},
				},
			},
			{
				displayName: 'Input Binary Field',
				name: 'inputBinaryField',
				type: 'string',
				default: "data",
				required: true,
				description: "Binary file of the image to perform operation",
				displayOptions: {
					show: {
						operation: [this.Operation()],
						binaryFile: [true],
					},
				},
			},
		]
	}
}

async function generateImage(input: Buffer | string, prompt: string, options: Image2ImageOptions) {
	if (typeof input === 'string') {
		input = await downloadImage(input)
	}
	const buffer = input

	const metadata = await sharp(buffer).metadata()
	let contentType = ''
	let filename = ''
	switch (metadata.format) {
		case 'png':
			contentType = 'image/png'
			filename = 'input.png'
			break
		case 'webp':
			contentType = 'image/webp'
			filename = 'input.webp'
			break
		case 'jpg':
			contentType = 'image/jpeg'
			filename = 'input.jpg'
			break
		default:
			throw new Error(`unsupported image format: ${metadata.format}`)
	}

	const client = new OpenAI({ apiKey: options.apiKey });
	const response = await client.images.edit({
		image: new File([buffer], filename, { type: contentType }),
		prompt,
		model: options.model,
		size: options.size as any,
		n: 1,
	});

	const b64 = response.data?.[0]?.b64_json;
	if (!b64) {
		throw new Error(`failed to generate image, ${response}`);
	}
	return Buffer.from(b64, "base64");
}
