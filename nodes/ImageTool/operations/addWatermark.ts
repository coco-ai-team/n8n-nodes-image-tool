import type { IExecuteFunctions, INodeCredentialDescription, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import type { OperationHandler } from '../utils/types';
import { makeImageInputProperties, makeImageReturnItem, makeOptionProperties, makeOutputFieldProperty, parseImageInput, parseOptions } from '../utils';
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
		// step 1: parse parameters here
		const imageBuffer = await parseImageInput(executeFunctions)
		const watermarkBuffer = await parseImageInput(executeFunctions, 'watermark')
		const options = parseOptions(executeFunctions) as AddWatermarkOptions

		// step 2: do something here
		const data = await addWatermark(imageBuffer, watermarkBuffer, options)

		// step 3: save data to returnItems
		const returnItem = await makeImageReturnItem(executeFunctions, data)
		return [[returnItem]]
	}

	credential(): INodeCredentialDescription[] {
		return []
	}

	properties(): INodeProperties[] {
		return [
			...makeOutputFieldProperty(this.Operation()),
			...makeImageInputProperties(this.Operation()),
			...makeImageInputProperties(this.Operation(), { field: 'watermark' }),
			...makeOptionProperties(this.Operation(), [
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
			]),
		]
	}
}

async function addWatermark(imageBuffer: Buffer, watermarkBuffer: Buffer, config: AddWatermarkOptions): Promise<Buffer> {
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
