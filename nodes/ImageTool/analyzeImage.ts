import { HumanMessage } from "@langchain/core/messages"
import { AzureChatOpenAI } from "@langchain/openai"

export interface AzureChatOpenAIConfig {
	azureOpenAIApiKey: string
	azureOpenAIApiDeploymentName: string
	azureOpenAIApiInstanceName: string
	azureOpenAIApiVersion: string
	temperature?: number
}

export default async function analyzeImage(config: AzureChatOpenAIConfig, prompt: string, images: string) {
	const client = new AzureChatOpenAI(config)
	const imageUrls = images.split(',').map((image) => ({
		type: 'image_url',
		image_url: {
			url: image
		}
	}))

	const content = [{
		type: 'text',
		text: prompt,
	}, ...imageUrls]

	const humanMessage = new HumanMessage({ content })

	const response = await client.invoke([humanMessage])
	return response.content as string
}
