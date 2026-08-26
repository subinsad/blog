/**
 * pnpm fonts:sync
 * pretendard 패키지의 dynamic subset 을 public/ 으로 복사하고
 * CSS 경로를 public 기준으로 바꿔 src/app/fonts.css 를 다시 만든다.
 */
import { readFile, writeFile, mkdir, readdir, copyFile, rm } from 'node:fs/promises'
import { join } from 'node:path'

const SRC = 'node_modules/pretendard/dist/web/variable'
const OUT = 'public/fonts/pretendard'

await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

const files = (await readdir(join(SRC, 'woff2-dynamic-subset'))).filter((f) => f.endsWith('.woff2'))
for (const f of files) {
  await copyFile(join(SRC, 'woff2-dynamic-subset', f), join(OUT, f))
}

const css = await readFile(join(SRC, 'pretendardvariable-dynamic-subset.css'), 'utf8')
const header = `/*
  Pretendard dynamic subset — 유니코드 구간별로 쪼갠 ${files.length}개 파일.
  브라우저가 화면에 실제로 쓰인 글자의 구간만 내려받는다.

  전체 파일 하나(2MB)를 preload 하면 첫 화면 전송량의 73%를 폰트가 차지한다.
  이 파일은 pretendard 패키지의 CSS 를 경로만 바꿔 옮긴 것이다.
  폰트를 올릴 때 \`pnpm fonts:sync\` 로 다시 생성한다.
*/
`
await writeFile('src/app/fonts.css', header + css.replaceAll('./woff2-dynamic-subset/', '/fonts/pretendard/'), 'utf8')

console.log(`  ${files.length}개 서브셋 복사 · src/app/fonts.css 갱신`)
