import axios from 'axios';
import { correctColor as adjustColor } from 'ai-color-correction';
import { fromBuffer } from 'file-type';

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

export default async function correctColor(url: string, colorBalance: ColorBalance) {
	const response = await axios.get(url, { responseType: 'arraybuffer' });
	const buffer = Buffer.from(response.data)
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
