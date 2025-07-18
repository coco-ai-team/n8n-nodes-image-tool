import axios from 'axios';
import { Jimp } from 'jimp'
import { fromBuffer } from 'file-type';

export interface ColorBalance {
	shadows: { red: number, green: number, blue: number },
	midtones: { red: number, green: number, blue: number },
	highlights: { red: number, green: number, blue: number }
}

const DEFAULT_COLOR_BALANCE: ColorBalance = {
	shadows: { red: -5, green: 0, blue: 10 },
	midtones: { red: -6, green: 0, blue: 20 },
	highlights: { red: -6, green: 0, blue: 15 }
}

export default async function correctColor(url: string, colorBalance: ColorBalance = DEFAULT_COLOR_BALANCE) {
	const response = await axios.get(url, { responseType: 'arraybuffer' });
	return adjustColor(Buffer.from(response.data), colorBalance)
}

async function adjustColor(buffer: Buffer, colorBalance: ColorBalance) {
	const image = await Jimp.read(buffer)

	image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, i) {
		const pixels = image.bitmap.data

		const r = pixels[i];       // Red
		const g = pixels[i + 1];   // Green
		const b = pixels[i + 2];   // Blue

		// 灰度亮度
		const originalLuminance = 0.299 * r + 0.587 * g + 0.114 * b;

		// 新的 RGB 初始化为原始值
		let newR = r;
		let newG = g;
		let newB = b;

		// 按亮度调整阴影、中间调或高光
		if (originalLuminance < 85) {
			newR += colorBalance.shadows.red;
			newG += colorBalance.shadows.green;
			newB += colorBalance.shadows.blue;
		} else if (originalLuminance < 170) {
			newR += colorBalance.midtones.red;
			newG += colorBalance.midtones.green;
			newB += colorBalance.midtones.blue;
		} else {
			newR += colorBalance.highlights.red;
			newG += colorBalance.highlights.green;
			newB += colorBalance.highlights.blue;
		}

		// 限制在 0~255 范围
		newR = Math.max(0, Math.min(255, newR));
		newG = Math.max(0, Math.min(255, newG));
		newB = Math.max(0, Math.min(255, newB));

		// 重新计算亮度，保持明度一致
		const adjustedLuminance = 0.299 * newR + 0.587 * newG + 0.114 * newB;
		const luminanceRatio = originalLuminance / (adjustedLuminance || 1);  // 避免除以0

		newR = Math.max(0, Math.min(255, newR * luminanceRatio));
		newG = Math.max(0, Math.min(255, newG * luminanceRatio));
		newB = Math.max(0, Math.min(255, newB * luminanceRatio));

		// 写回数据
		pixels[i] = newR;
		pixels[i + 1] = newG;
		pixels[i + 2] = newB;
	})

	let mimeType = 'image/png'
	const typ = await imageType(buffer)
	if (typ) {
		mimeType = typ.mime
	}

	return image.getBuffer(mimeType as any)
}

async function imageType(buffer: Buffer) {
	const result = await fromBuffer(buffer)
	if (result) {
		return { mime: result.mime, ext: result.ext }
	}
	return null
}
