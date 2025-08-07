import { correctColor as adjustColor } from 'ai-color-correction';
import { fromBuffer } from 'file-type';
import downloadImage from './downloadImage';

export interface RGB {
	red: number,
	green: number,
	blue: number
}

export interface ColorBalance {
	shadows: RGB,
	midtones: RGB,
	highlights: RGB
}

export default async function correctColor(input: string | Buffer, colorBalance: ColorBalance) {
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
