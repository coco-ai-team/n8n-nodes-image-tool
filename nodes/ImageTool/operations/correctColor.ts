import type { IExecuteFunctions, INodeCredentialDescription, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import type { OperationHandler } from '../utils/types';
import { fromBuffer } from 'file-type';
import { downloadImage } from '../utils';
import { correctColor as adjustColor } from 'ai-color-correction';

type RGB = {
	red: number,
	green: number,
	blue: number
}

type ColorBalance = {
	shadows: RGB,
	midtones: RGB,
	highlights: RGB
}

export default class CorrectColorOperation implements OperationHandler {
	Name(): string {
		return 'Color Correction'
	}

	Description(): string {
		return "Adjust the color tone of the ai generated image"
	}

	Operation(): string {
		return 'colorCorrection'
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
		const { shadows = { red: -5, green: 0, blue: 10 } } = executeFunctions.getNodeParameter('shadows', 0) as { shadows: RGB }
		const { midtones = { red: -6, green: 0, blue: 20 } } = executeFunctions.getNodeParameter('midtones', 0) as { midtones: RGB }
		const { highlights = { red: -6, green: 0, blue: 15 } } = executeFunctions.getNodeParameter('highlights', 0) as { highlights: RGB }

		// step 2: do something here
		const image = await correctColor(input, { shadows, midtones, highlights })

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
				displayName: 'Shadows',
				name: 'shadows',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				displayOptions: {
					show: {
						operation: [this.Operation()],
					},
				},
				default: {},
				placeholder: 'Edit Shadows',
				options: [
					{
						displayName: 'Shadows',
						name: 'shadows',
						values: [
							{
								displayName: 'Cyan-Red',
								name: 'red',
								type: 'number',
								typeOptions: {
									minValue: -20,
									maxValue: 20,
								},
								default: -5,
							},
							{
								displayName: 'Magenta-Green',
								name: 'green',
								type: 'number',
								typeOptions: {
									minValue: -20,
									maxValue: 20,
								},
								default: 0,
							},
							{
								displayName: 'Yellow-Blue',
								name: 'blue',
								type: 'number',
								typeOptions: {
									minValue: -20,
									maxValue: 20,
								},
								default: 10,
							},
						],
					}
				]
			},
			{
				displayName: 'Midtones',
				name: 'midtones',
				type: 'fixedCollection',
				displayOptions: {
					show: {
						operation: [this.Operation()],
					},
				},
				default: {},
				required: true,
				typeOptions: {
					multipleValues: false,
				},
				placeholder: 'Edit Midtones',
				options: [
					{
						displayName: 'Midtones',
						name: 'midtones',
						values: [
							{
								displayName: 'Cyan-Red',
								name: 'red',
								type: 'number',
								typeOptions: {
									minValue: -20,
									maxValue: 20,
								},
								default: -5,
							},
							{
								displayName: 'Magenta-Green',
								name: 'green',
								type: 'number',
								typeOptions: {
									minValue: -20,
									maxValue: 20,
								},
								default: 0,
							},
							{
								displayName: 'Yellow-Blue',
								name: 'blue',
								type: 'number',
								typeOptions: {
									minValue: -20,
									maxValue: 20,
								},
								default: 10,
							},
						],
					}
				]
			},
			{
				displayName: 'Highlights',
				name: 'highlights',
				type: 'fixedCollection',
				displayOptions: {
					show: {
						operation: [this.Operation()],
					},
				},
				default: {},
				required: true,
				typeOptions: {
					multipleValues: false,
				},
				placeholder: 'Edit Highlights',
				options: [
					{
						displayName: 'Highlights',
						name: 'highlights',
						values: [
							{
								displayName: 'Cyan-Red',
								name: 'red',
								type: 'number',
								typeOptions: {
									minValue: -20,
									maxValue: 20,
								},
								default: -5,
							},
							{
								displayName: 'Magenta-Green',
								name: 'green',
								type: 'number',
								typeOptions: {
									minValue: -20,
									maxValue: 20,
								},
								default: 0,
							},
							{
								displayName: 'Yellow-Blue',
								name: 'blue',
								type: 'number',
								typeOptions: {
									minValue: -20,
									maxValue: 20,
								},
								default: 10,
							},
						],
					}
				]
			},
		]
	}
}

async function correctColor(input: string | Buffer, colorBalance: ColorBalance) {
	if (typeof input === 'string') {
		input = await downloadImage(input)
	}
	const buffer = input as Buffer
	let mimeType = 'image/png'
	const typ = await imageType(buffer)
	if (typ) { mimeType = typ.mime }
	return adjustColor(buffer, mimeType as any, colorBalance)
}

async function imageType(buffer: Buffer) {
	const result = await fromBuffer(buffer)
	if (result) {
		return { mime: result.mime, ext: result.ext }
	}
	return null
}
