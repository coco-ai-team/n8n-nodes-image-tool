import type {
	IExecuteFunctions,
	INodeCredentialDescription,
	INodeExecutionData,
	INodeProperties
} from "n8n-workflow"

export interface OperationHandler {
	Name(): string
	Description(): string
	Operation(): string
	execute(executeFunctions: IExecuteFunctions): Promise<INodeExecutionData[][]>
	credential(): INodeCredentialDescription[]
	properties(): INodeProperties[]
}
