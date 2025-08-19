import axios from "axios";

export async function downloadImage(url: string) {
	const response = await axios.get(url, { responseType: 'arraybuffer' });
	return Buffer.from(response.data)
}
