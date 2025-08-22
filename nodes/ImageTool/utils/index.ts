import type { IExecuteFunctions, INodeExecutionData, INodeProperties, INodePropertyCollection, INodePropertyOptions } from "n8n-workflow";
import sharp from "sharp";
import axios from "axios";

export async function downloadImage(url: string) {
	const response = await axios.get(url, { responseType: 'arraybuffer' });
	return Buffer.from(response.data)
}

export async function makeImageReturnItem(executeFunctions: IExecuteFunctions, buffer: Buffer, extraData?: Record<string, any>): Promise<INodeExecutionData> {
	const meta = await sharp(buffer).metadata()
	const data = await executeFunctions.helpers.prepareBinaryData(buffer)
	const outputField = parseOutputField(executeFunctions)

	return {
		json: {
			...extraData,
			format: meta.format,
			width: meta.width,
			height: meta.height,
			size: meta.size,
		},
		binary: { [outputField]: data }
	}
}

export async function parseImageInput(executeFunctions: IExecuteFunctions, field?: string): Promise<Buffer> {
	const fieldNames = makeImageInputPropertyNames(field)

	const binaryFile = executeFunctions.getNodeParameter(fieldNames.binaryFile, 0) as boolean
	if (binaryFile) {
		const inputBinaryField = executeFunctions.getNodeParameter(fieldNames.inputBinaryField, 0) as string
		return await executeFunctions.helpers.getBinaryDataBuffer(0, inputBinaryField) as Buffer;
	} else {
		const url = executeFunctions.getNodeParameter(fieldNames.url, 0) as string
		return await downloadImage(url)
	}
}

export function makeImageInputProperties(operation: string, config?: {
	field?: string
}): INodeProperties[] {
	const fieldNames = makeImageInputPropertyNames(config?.field)
	const displayNames = makeImageInputPropertyDisplayNames(config?.field)
	return [
		{
			displayName: displayNames.binaryFile,
			name: fieldNames.binaryFile,
			type: 'boolean',
			default: false,
			required: true,
			description: "Whether the image to perform operation should be taken from binary field",
			displayOptions: {
				show: {
					operation: [operation],
				},
			},
		},
		{
			displayName: displayNames.url,
			name: fieldNames.url,
			type: 'string',
			default: "",
			required: true,
			placeholder: "e.g. https://example.com/image.png",
			description: "URL of the image to perform operation",
			displayOptions: {
				show: {
					operation: [operation],
					[fieldNames.binaryFile]: [false],
				},
			},
		},
		{
			displayName: displayNames.inputBinaryField,
			name: fieldNames.inputBinaryField,
			type: 'string',
			default: "data",
			required: true,
			description: "Binary file of the image to perform operation",
			displayOptions: {
				show: {
					operation: [operation],
					[fieldNames.binaryFile]: [true],
				},
			},
		},
	]
}

function makeImageInputPropertyDisplayNames(field?: string) {
	return {
		binaryFile: field ? `Binary File(${field})` : 'Binary File',
		url: field ? `URL(${field})` : 'URL',
		inputBinaryField: field ? `Input Binary Field(${field})` : 'Input Binary Field',
	}
}

function makeImageInputPropertyNames(field?: string) {
	return {
		binaryFile: field ? `binaryFile_${field}` : 'binaryFile',
		url: field ? `url_${field}` : 'url',
		inputBinaryField: field ? `inputBinaryField_${field}` : 'inputBinaryField',
	}
}

export function makeOutputFieldProperty(operation: string): INodeProperties[] {
	return [{
		displayName: 'Output Field',
		name: 'outputField',
		type: 'string',
		default: 'data',
		description: "Output buffer field name",
		displayOptions: {
			show: {
				operation: [operation],
			},
		},
	}]
}

export function parseOutputField(executeFunctions: IExecuteFunctions): string {
	try {
		return executeFunctions.getNodeParameter('outputField', 0) as string
	} catch (error) {
		return 'data'
	}
}

export function makeOptionProperties(operation: string, options: Array<INodePropertyOptions | INodeProperties | INodePropertyCollection>): INodeProperties[] {
	return [{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Options',
		default: {},
		displayOptions: {
			show: {
				operation: [operation],
			},
		},
		options,
	}]
}

export function parseOptions(executeFunctions: IExecuteFunctions): Record<string, unknown> {
	try {
		return executeFunctions.getNodeParameter('options', 0) as Record<string, unknown>
	} catch (error) {
		return {}
	}
}
