import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import correctColor from './correctColor';
import analyzeImage, { AzureChatOpenAIConfig } from './analyzeImage';

export class ImageTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Image Tool',
		name: 'imageTool',
		icon: 'file:imageTool.svg',
		group: ['transform'],
		version: 1,
		description: 'Image-related tools, including image analysis and color correction',
		defaults: {
			name: 'Image Tool',
		},
		credentials: [
			{
				name: 'azureOpenAIApi',
				required: true,
				displayOptions: {
					show: {
						operation: ['imageAnalysis'],
					},
				},
			}
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Image Analysis',
						value: 'imageAnalysis',
						description: 'Using Azure OpenAI for image analysis and labeling',
						action: 'Image analysis',
					},
					{
						name: 'Color Correction',
						value: 'colorCorrection',
						description: 'Adjust the color tone of the ai generated image',
						action: 'Color correction',
					},
				],
				default: 'imageAnalysis',
			},
			// Image Analysis
			{
				displayName: 'URL(s)',
				name: 'urls',
				type: 'string',
				default: "",
				required: true,
				placeholder: "e.g. https://example.com/image.jpg",
				description: "URL(s) of the image(s) to perform operation, multiple URLs can be added separated by comma",
				displayOptions: {
					show: {
						operation: ['imageAnalysis'],
					},
				},
			},
			{
				displayName: 'Text Input',
				name: 'prompt',
				type: 'string',
				default: "What's in this image?",
				required: true,
				placeholder: "",
				typeOptions: {
					rows: 10,
				},
				displayOptions: {
					show: {
						operation: ['imageAnalysis'],
					},
				},
				description: 'Requires API credentials (azureOpenAIApi)',
			},
			// Color Correction
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
						operation: ['colorCorrection'],
					},
				},
			},
		],
		inputs: [NodeConnectionType.Main],
		outputs: [{ type: NodeConnectionType.Main }]
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		try {
			const operation = this.getNodeParameter('operation', 0) as string
			const returnItems: INodeExecutionData[] = [];
			switch (operation) {
				case 'imageAnalysis':
					const urls = this.getNodeParameter('urls', 0) as string
					const prompt = this.getNodeParameter('prompt', 0) as string
					const azureOpenAIApi = await this.getCredentials('azureOpenAIApi') as AzureChatOpenAIConfig
					const response = await analyzeImage(azureOpenAIApi, prompt, urls)
					returnItems.push({
						json: {
							response
						}
					})
					break;
				case 'colorCorrection':
					const url = this.getNodeParameter('url', 0) as string
					const image = await correctColor(url)
					const data = await this.helpers.prepareBinaryData(image)
					returnItems.push({
						json: {},
						binary: { data }
					})
					break;
			}
			return [returnItems]
		} catch (error) {
			throw new NodeOperationError(this.getNode(), error as Error);
		}
	}
}
