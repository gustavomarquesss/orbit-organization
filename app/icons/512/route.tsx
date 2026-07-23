import { ImageResponse } from "next/og";
import { AppIconMark } from "@/lib/utils/app-icon-mark";

const size = 512;

export async function GET() {
  return new ImageResponse(<AppIconMark size={size} />, { width: size, height: size });
}
