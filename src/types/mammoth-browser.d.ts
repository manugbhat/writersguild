declare module "mammoth/mammoth.browser" {
  interface ConvertResult {
    value: string;
    messages: { type: string; message: string }[];
  }
  interface ConvertInput {
    arrayBuffer: ArrayBuffer;
  }
  export function convertToHtml(input: ConvertInput): Promise<ConvertResult>;
  export function extractRawText(input: ConvertInput): Promise<ConvertResult>;
  const _default: {
    convertToHtml: typeof convertToHtml;
    extractRawText: typeof extractRawText;
  };
  export default _default;
}
