import type { IExecuteFunctions, INodeCredentialDescription, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import type { OperationHandler } from '../utils/types';
import { makeImageInputProperties, makeImageReturnItem, makeOptionProperties, makeOutputFieldProperty, parseImageInput, parseOptions } from '../utils';
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
		// step 1: parse parameters here
		const imageBuffer = await parseImageInput(executeFunctions)

		let minQuality, maxQuality, maxSize, quality, effort
		const autoQuality = executeFunctions.getNodeParameter('autoQuality', 0) as boolean
		if (autoQuality) {
			minQuality = executeFunctions.getNodeParameter('minQuality', 0) as number
			maxQuality = executeFunctions.getNodeParameter('maxQuality', 0) as number
			maxSize = executeFunctions.getNodeParameter('maxSize', 0) as number
		} else {
			quality = executeFunctions.getNodeParameter('customQuality', 0) as number
		}

		const options = parseOptions(executeFunctions) as { effort: number }
		effort = options.effort

		// step 2: do something here
		const { compressedBuffer, quality: compressedQuality, originalSize } = await compressImage(imageBuffer, {
			minQuality,
			maxQuality,
			maxSize,
			quality,
			effort,
		})

		// step 3: save data to returnItems
		const returnItem = await makeImageReturnItem(executeFunctions, compressedBuffer, {
			quality: compressedQuality,
			originalSize,
		})
		return [[returnItem]]
	}

	credential(): INodeCredentialDescription[] {
		return []
	}

	properties(): INodeProperties[] {
		return [
			...makeOutputFieldProperty(this.Operation()),
			...makeImageInputProperties(this.Operation()),
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
			...makeOptionProperties(this.Operation(), [
				{
					displayName: 'Compress Effort',
					name: 'compressEffort',
					type: 'number',
					description: "Effort controls the CPU intensity of compression, 0 is the fastest, 6 is the slowest",
					default: 4,
				}
			]),
		]
	}
}

async function compressImage(buffer: Buffer, config: CompressConfig) {
	let compressedBuffer = buffer;
	let quality = 0;

	if (config.maxSize) {
		const maxSize = config.maxSize!
		let left = config.minQuality!
		let right = config.maxQuality!

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
		quality = config.quality!
		compressedBuffer = await sharp(buffer).webp({ quality, effort: config.effort }).toBuffer()
	}

	return {
		originalSize: buffer.length,
		compressedBuffer,
		quality,
	}
}
