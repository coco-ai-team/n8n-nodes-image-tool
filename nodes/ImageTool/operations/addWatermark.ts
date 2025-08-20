import type { IExecuteFunctions, INodeCredentialDescription, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import type { OperationHandler } from '../utils/types';
import { downloadImage } from '../utils';
import sharp from 'sharp';

type AddWatermarkOptions = {
	top?: number
	left?: number
	right?: number
	bottom?: number
	watermarkScale?: number
}

export default class AddWatermarkOperation implements OperationHandler {
	Name(): string {
		return 'Add Watermark'
	}

	Description(): string {
		return "Add watermark to image"
	}

	Operation(): string {
		return 'addWatermark'
	}

	async execute(executeFunctions: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnItems: INodeExecutionData[] = []

		// step 1: parse parameters here
		const watermarkUrl = executeFunctions.getNodeParameter('watermarkUrl', 0) as string
		let input: Buffer | string
		const binaryFile = executeFunctions.getNodeParameter('binaryFile', 0) as boolean
		if (binaryFile) {
			const inputBinaryField = executeFunctions.getNodeParameter('inputBinaryField', 0) as string
			input = await executeFunctions.helpers.getBinaryDataBuffer(0, inputBinaryField);
		} else {
			input = executeFunctions.getNodeParameter('url', 0) as string
		}
		const options = executeFunctions.getNodeParameter('options', 0) as AddWatermarkOptions

		// step 2: do something here
		const image = await addWatermark(input, watermarkUrl, options)

		// step 3: save data to returnItems
		const data = await executeFunctions.helpers.prepareBinaryData(image)
		returnItems.push({
			json: {},
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
				displayName: 'Watermark URL',
				name: 'watermarkUrl',
				type: 'string',
				default: "",
				required: true,
				placeholder: "e.g. https://example.com/image.jpg",
				description: "URL of the watermark image",
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
						displayName: 'Bottom Margin',
						name: 'bottom',
						type: 'number',
						description: "The pixel offset from the bottom edge",
						default: 0,
					},
					{
						displayName: 'Left Margin',
						name: 'left',
						type: 'number',
						description: "The pixel offset from the left edge, left is prioritized over right",
						default: 0,
					},
					{
						displayName: 'Right Margin',
						name: 'right',
						type: 'number',
						description: "The pixel offset from the right edge",
						default: 0,
					},
					{
						displayName: 'Top Margin',
						name: 'top',
						type: 'number',
						description: "The pixel offset from the top edge, top is prioritized over bottom",
						default: 0,
					},
					{
						displayName: 'Watermark Scale',
						name: 'watermarkScale',
						type: 'number',
						description: "Scale of the watermark",
						default: 1,
					},
				]
			},
		]
	}
}

async function addWatermark(input: string | Buffer, watermarkUrl: string, config: AddWatermarkOptions): Promise<Buffer> {
	let watermarkBuffer: Buffer
	let imageBuffer: Buffer
	if (typeof input === 'string') {
		[watermarkBuffer, imageBuffer] = await Promise.all([downloadImage(watermarkUrl), downloadImage(input)])
	} else {
		watermarkBuffer = await downloadImage(watermarkUrl)
		imageBuffer = input
	}

	let watermark = sharp(watermarkBuffer)
	let watermarkMeta = await watermark.metadata()

	// scale watermark if needed
	if (config.watermarkScale && config.watermarkScale !== 1) {
		const width = Math.floor(watermarkMeta.width * config.watermarkScale)
		watermarkBuffer = await watermark.resize({ width, fit: 'contain' }).toBuffer()
		watermark = sharp(watermarkBuffer)
		watermarkMeta = await watermark.metadata()
	}

	const image = sharp(imageBuffer)
	const imageMeta = await image.metadata()
	let top = config.top
	if (top === undefined) {
		if (config.bottom !== undefined) {
			top = imageMeta.height - watermarkMeta.height - config.bottom
		} else {
			top = 0
		}
	}

	let left = config.left
	if (left === undefined) {
		if (config.right !== undefined) {
			left = imageMeta.width - watermarkMeta.width - config.right
		} else {
			left = 0
		}
	}

	return await sharp(imageBuffer)
		.composite([{
			input: watermarkBuffer,
			top,
			left,
		}])
		.toBuffer()
}
