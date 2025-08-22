import type { IExecuteFunctions, INodeCredentialDescription, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import type { OperationHandler } from '../utils/types';
import { downloadImage, makeImageReturnItem, makeOutputFieldProperty } from '../utils';

export default class DownloadImageOperation implements OperationHandler {
	Name(): string {
		return 'Image Download'
	}

	Description(): string {
		return "Download image from URL"
	}

	Operation(): string {
		return 'imageDownload'
	}

	async execute(executeFunctions: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const url = executeFunctions.getNodeParameter('url', 0) as string
		const data = await downloadImage(url)

		const returnItem = await makeImageReturnItem(executeFunctions, data)
		return [[returnItem]]
	}

	credential(): INodeCredentialDescription[] {
		return []
	}

	properties(): INodeProperties[] {
		return [
			...makeOutputFieldProperty(this.Operation()),
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: "",
				required: true,
				placeholder: "e.g. https://example.com/image.jpg",
				description: "URL of the image to download",
				displayOptions: {
					show: {
						operation: [this.Operation()],
					},
				},
			},
		]
	}
}
