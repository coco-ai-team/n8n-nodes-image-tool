import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class OpenAIApi implements ICredentialType {
	documentationUrl = "https://openai.com/";
	name = 'openAIApi';
	displayName = 'OpenAI API';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'openAIApiKey',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
		},
	];
}
