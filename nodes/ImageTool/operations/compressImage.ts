import type { IExecuteFunctions, INodeCredentialDescription, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import type { OperationHandler } from '../utils/types';
import { downloadImage } from '../utils';
import sharp from 'sharp';

export type CompressConfig = {
	quality?: number,
	maxSize?: number,
	minQuality?: number,
	maxQuality?: number,
	effort?: number
}

export default class CompressImageOperation implements OperationHandler {
	Name(): string {
		return 'Image Compress'
	}

	Description(): string {
		return "Compress image and output in WebP format"
	}

	Operation(): string {
		return 'imageCompress'
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

		const config: CompressConfig = {}
		const autoQuality = executeFunctions.getNodeParameter('autoQuality', 0) as boolean
		if (autoQuality) {
			config.minQuality = executeFunctions.getNodeParameter('minQuality', 0) as number
			config.maxQuality = executeFunctions.getNodeParameter('maxQuality', 0) as number
			config.maxSize = executeFunctions.getNodeParameter('maxSize', 0) as number
		} else {
			config.quality = executeFunctions.getNodeParameter('customQuality', 0) as number
		}
		const options = executeFunctions.getNodeParameter('options', 0) as { effort: number }
		config.effort = options.effort

		// step 2: do something here
		const { compressedBuffer, quality, originalSize, compressedSize } = await compressImage(input, config)

		// step 3: save data to returnItems
		const data = await executeFunctions.helpers.prepareBinaryData(compressedBuffer)
		returnItems.push({
			json: {
				quality,
				originalSize,
				compressedSize,
			},
			binary: { data }
		})

		return [returnItems]
	}

	credential(): INodeCredentialDescription[] {
		return []
	}

	properties(): INodeProperties[] {
		return [
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
			{
				displayName: 'Auto Quality',
				name: 'autoQuality',
				type: 'boolean',
				default: true,
				required: true,
				description: "Whether to use auto quality or custom quality",
				displayOptions: {
					show: {
						operation: [this.Operation()],
					},
				},
			},
			{
				displayName: 'Minimum Quality',
				name: 'minQuality',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 1,
				displayOptions: {
					show: {
						operation: [this.Operation()],
						autoQuality: [true],
					},
				},
				description: "Minimum quality of the compressed image",
			},
			{
				displayName: 'Maximum Quality',
				name: 'maxQuality',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 100,
				displayOptions: {
					show: {
						operation: [this.Operation()],
						autoQuality: [true],
					},
				},
				description: "Maximum quality of the compressed image",
			},
			{
				displayName: 'Maximum Size (Bytes)',
				name: 'maxSize',
				type: 'number',
				default: 1048576,
				displayOptions: {
					show: {
						operation: [this.Operation()],
						autoQuality: [true],
					},
				},
				description: "Maximum size of the compressed image, in bytes",
			},
			{
				displayName: 'Custom Quality',
				name: 'customQuality',
				type: 'number',
				default: 80,
				displayOptions: {
					show: {
						operation: [this.Operation()],
						autoQuality: [false],
					},
				},
				description: "Specify the quality of the compressed image",
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Options',
				default: {},
				displayOptions: {
					show: {
						operation: [this.Operation()],
					},
				},
				options: [
					{
						displayName: 'Compress Effort',
						name: 'compressEffort',
						type: 'number',
						description: "Effort controls the CPU intensity of compression, 0 is the fastest, 6 is the slowest",
						default: 4,
					}
				]
			},
		]
	}
}

async function compressImage(input: Buffer | string, config?: CompressConfig) {
	if (typeof input === 'string') {
		input = await downloadImage(input)
	}
	const buffer = input as Buffer

	let compressedBuffer = buffer;
	let quality = 0;

	if (config?.maxSize) {
		const maxSize = config?.maxSize!
		let left = config?.minQuality!
		let right = config?.maxQuality!

		while (left <= right) {
			const mid = Math.floor((left + right) / 2);
			const out = await sharp(buffer).webp({ quality: mid }).toBuffer();

			if (out.length <= maxSize) {
				compressedBuffer = out;
				quality = mid;
				left = mid + 1;
			} else {
				right = mid - 1;
			}
		}
	} else {
		quality = config?.quality!
		compressedBuffer = await sharp(buffer).webp({ quality, effort: config?.effort }).toBuffer()
	}

	return {
		originalSize: buffer.length,
		compressedSize: compressedBuffer.length,
		compressedBuffer,
		quality,
	}
}
