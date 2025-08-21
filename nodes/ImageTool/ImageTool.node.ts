import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { OperationHandler } from './utils/types';
import CorrectColorOperation from './operations/correctColor';
import DownloadImageOperation from './operations/downloadImage';
import CompressImageOperation from './operations/compressImage';
import AddWatermarkOperation from './operations/addWatermark';
import Image2ImageOperation from './operations/image2image';

const operationHandlers: OperationHandler[] = [
	new CorrectColorOperation(),
	new DownloadImageOperation(),
	new CompressImageOperation(),
	new AddWatermarkOperation(),
	new Image2ImageOperation(),
]

export class ImageTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Image Tool',
		name: 'imageTool',
		icon: 'file:imageTool.svg',
		group: ['transform'],
		version: 1,
		description: 'Image-related tools, including image analysis, color correction, and image compression, etc.',
		defaults: {
			name: 'Image Tool',
		},
		credentials: operationHandlers.filter(operation => operation.credential().length > 0).map(operation => operation.credential()).flat(),
		properties: [
			{
				displayName: 'Operation',
				name: 'operation', // ** can't modify this name, it's used to identify the operation, and control the operation properties **
				type: 'options',
				noDataExpression: true,
				options: operationHandlers.map(operation => ({
					name: operation.Name(),
					action: operation.Name(),
					value: operation.Operation(),
					description: operation.Description(),
				})),
				default: '',
			},
			...operationHandlers.map(operation => operation.properties()).flat(),
		] as any,
		inputs: [NodeConnectionType.Main],
		outputs: [{ type: NodeConnectionType.Main }]
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		try {
			const operation = this.getNodeParameter('operation', 0) as string
			const operationHandler = operationHandlers.find(handler => handler.Operation() === operation)
			if (!operationHandler) {
				throw new NodeOperationError(this.getNode(), new Error(`Unknown operation: ${operation}`))
			}
			return await operationHandler.execute(this)
		} catch (error) {
			throw new NodeOperationError(this.getNode(), error as Error);
		}
	}
}
