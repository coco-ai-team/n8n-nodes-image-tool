import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AzureOpenAIApi implements ICredentialType {
	documentationUrl = "https://azure.microsoft.com/en-us/products/ai-services/openai-service";
	name = 'azureOpenAIApi';
	displayName = 'Azure OpenAI API';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'azureOpenAIApiKey',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
		},
		{
			displayName: 'Instance',
			name: 'azureOpenAIApiInstanceName',
			type: 'string',
			default: "",
			required: true,
		},
		{
			displayName: 'Deployment',
			name: 'azureOpenAIApiDeploymentName',
			type: 'string',
			default: "",
			required: true,
		},
		{
			displayName: 'Version',
			name: 'azureOpenAIApiVersion',
			type: 'string',
			default: "",
			required: true,
		},
	];
}