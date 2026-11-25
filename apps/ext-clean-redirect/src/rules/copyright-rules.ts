/**
 * 检测并剔除 CSDN、知乎、部分技术博客在复制时恶意追加的版权小尾巴
 */
export function stripCopyrightNotice(text: string): { cleanedText: string; stripped: boolean } {
  if (!text || typeof text !== 'string') {
    return { cleanedText: text, stripped: false };
  }

  // 典型版权尾巴模式：
  // 1. \n\n————————————————\n版权声明：本文为博主原创文章...
  // 2. \n\n作者：xxx\n链接：https://...\n来源：知乎\n著作权归作者所有...
  // 3. \n\n---------------------\n作者：...
  const patterns = [
    /(\r?\n){2,}[—\-]{3,}\r?\n*(版权声明|原文链接|作者|来源|著作权)[\s\S]*$/i,
    /(\r?\n){2,}(作者[：:]|来源[：:]|原文链接[：:]|著作权归|商业转载请联系|请注明出处)[\s\S]*$/i,
    /(\r?\n){2,}本文来自[^\r\n]+(未经允许|禁止转载|版权所有)[\s\S]*$/i
  ];

  for (const pattern of patterns) {
    if (pattern.test(text)) {
      const cleaned = text.replace(pattern, '').trimEnd();
      return { cleanedText: cleaned, stripped: true };
    }
  }

  return { cleanedText: text, stripped: false };
}
