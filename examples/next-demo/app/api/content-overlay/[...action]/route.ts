import { createContentAPI } from "next-content-overlay/server";

const handler = createContentAPI();

export const GET = handler;
export const POST = handler;
