import type { IExecuteFunctions, INodeCredentialDescription, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import type { OperationHandler } from '../utils/types';
import { makeImageInputProperties, makeImageReturnItem, makeOutputFieldProperty, parseImageInput } from '../utils';
import OpenAI from 'openai';
import sharp from 'sharp';

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
		// step 1: parse parameters here
		const openAIApi = await executeFunctions.getCredentials('openAIApi') as {
			openAIApiKey: string
		}
		const model = executeFunctions.getNodeParameter('model', 0) as string
		const size = executeFunctions.getNodeParameter('size', 0) as string
		const prompt = executeFunctions.getNodeParameter('prompt', 0) as string
		const image = await parseImageInput(executeFunctions)
		const convertUnsupportedFormatToPng = executeFunctions.getNodeParameter('convertUnsupportedFormatToPng', 0) as boolean

		// step 2: do something here
		const data = await generateImage({
			image,
			prompt,
			apiKey: openAIApi.openAIApiKey,
			model,
			size,
			convertUnsupportedFormatToPng,
		})

		// step 3: save data to returnItems
		const returnItem = await makeImageReturnItem(executeFunctions, data)
		return [[returnItem]]
	}
	properties(): INodeProperties[] {
		return [
			...makeOutputFieldProperty(this.Operation()),
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
			...makeImageInputProperties(this.Operation()),
			{
				displayName: 'Convert Unsupported Format to PNG',
				name: 'convertUnsupportedFormatToPng',
				type: 'boolean',
				default: false,
				required: true,
				description: "Whether the image is not a `png`, `webp`, or `jpg` file, it will be converted to `png` file before generating new image",
				displayOptions: {
					show: {
						operation: [this.Operation()],
					},
				},
			},
		]
	}
}

async function generateImage({
	image,
	prompt,
	apiKey,
	model,
	size,
	convertUnsupportedFormatToPng,
}: {
	image: Buffer
	prompt: string
	apiKey: string
	model: string
	size: string
	convertUnsupportedFormatToPng: boolean
}) {
	const metadata = await sharp(image).metadata()
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
			contentType = 'image/jpg'
			filename = 'input.jpg'
			break
		default:
			if (convertUnsupportedFormatToPng) {
				contentType = 'image/png'
				filename = 'input.png'
				image = await sharp(image).png().toBuffer()
			} else {
				throw new Error(`unsupported image format: ${metadata.format}`)
			}
	}

	const client = new OpenAI({ apiKey });
	const response = await client.images.edit({
		image: new File([image], filename, { type: contentType }),
		prompt,
		model,
		size: size as any,
		n: 1,
	});

	const b64 = response.data?.[0]?.b64_json;
	if (!b64) {
		throw new Error(`failed to generate image, ${response}`);
	}
	return Buffer.from(b64, "base64");
}
