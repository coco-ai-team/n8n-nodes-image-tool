import sharp from 'sharp';
import downloadImage from './downloadImage';

export type CompressConfig = {
	quality?: number,
	maxSize?: number,
	minQuality?: number,
	maxQuality?: number,
	effort?: number
}

export default async function compressImage(input: Buffer | string, config?: CompressConfig) {
	console.log('compressImage', input, config)
	if (typeof input === 'string') {
		input = await downloadImage(input)
	}
	const buffer = input as Buffer

	let compressedBuffer = buffer;
	let quality = 0;

	if (config?.maxSize) {
		const maxSize = config?.maxSize!
		let left = config?.minQuality!
		let right = config?.maxQuality!

		while (left <= right) {
			const mid = Math.floor((left + right) / 2);
			const out = await sharp(buffer).webp({ quality: mid }).toBuffer();

			if (out.length <= maxSize) {
				compressedBuffer = out;
				quality = mid;
				left = mid + 1;
			} else {
				right = mid - 1;
			}
		}
	} else {
		quality = config?.quality!
		compressedBuffer = await sharp(buffer).webp({ quality, effort: config?.effort }).toBuffer()
	}

	return {
		originalSize: buffer.length,
		compressedSize: compressedBuffer.length,
		compressedBuffer,
		quality,
	}
}
