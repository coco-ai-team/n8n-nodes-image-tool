import type { IExecuteFunctions, INodeCredentialDescription, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import type { OperationHandler } from '../utils/types';
import { HumanMessage } from "@langchain/core/messages"
import { AzureChatOpenAI } from "@langchain/openai"

export default class AnalyzeImageOperation implements OperationHandler {
	Name(): string {
		return 'Image Analysis'
	}

	Description(): string {
		return "Using Azure OpenAI for image analysis and labeling"
	}

	Operation(): string {
		return 'imageAnalysis'
	}

	async execute(executeFunctions: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnItems: INodeExecutionData[] = []

		// step 1: parse parameters here
		const urls = executeFunctions.getNodeParameter('urls', 0) as string
		const prompt = executeFunctions.getNodeParameter('prompt', 0) as string
		const options = executeFunctions.getNodeParameter('options', 0) as {
			temperature?: number
		}
		const azureOpenAIApi = await executeFunctions.getCredentials('azureOpenAIApi') as {
			azureOpenAIApiKey: string
			azureOpenAIApiDeploymentName: string
			azureOpenAIApiInstanceName: string
			azureOpenAIApiVersion: string
		}

		// step 2: do something here
		const client = new AzureChatOpenAI({
			...azureOpenAIApi,
			temperature: options.temperature,
		})
		const imageUrls = urls.split(',').map((url) => ({
			type: 'image_url',
			image_url: { url }
		}))
		const content = [{
			type: 'text',
			text: prompt,
		}, ...imageUrls]
		const humanMessage = new HumanMessage({ content })
		const response = await client.invoke([humanMessage])

		// step 3: save data to returnItems
		returnItems.push({
			json: {
				content: response.content as string
			}
		})

		return [returnItems]
	}

	credential(): INodeCredentialDescription[] {
		return [
			{
				name: 'azureOpenAIApi',
				required: true,
				displayOptions: {
					show: {
						operation: [this.Operation()],
					},
				},
			}
		]
	}

	properties(): INodeProperties[] {
		return [
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
						operation: [this.Operation()],
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
						operation: [this.Operation()],
					},
				},
				description: 'Requires API credentials (azureOpenAIApi)',
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
						displayName: 'Temperature',
						name: 'temperature',
						type: 'number',
						description: "Temperature for the image analysis",
						default: 0,
					}
				]
			},
		]
	}
}
