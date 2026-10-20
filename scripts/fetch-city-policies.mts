/**
 * Download the official sources linked from the city policy reference.
 *
 * Usage: node scripts/fetch-city-policies.mts [--output-dir /tmp/paycalc-city-policies]
 */

import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type CurlResult = {
  exitCode: number | null
  stdout: string
  stderr: string
}

type SourceResult = {
  label: string
  url: string
  effectiveUrl: string
  status: number
  mime: string
  bytes: number
  sha256: string
  file: string
  reviewRequired: boolean
}

type FetchFailure = {
  label: string
  url: string
  error: string
}

type FetchResult = {
  results: SourceResult[]
  failures: FetchFailure[]
}

const _referencePath = fileURLToPath(new URL('../docs/city-policies.md', import.meta.url))
const _outputIndex = process.argv.indexOf('--output-dir')
const _outputDir =
  _outputIndex === -1
    ? join(tmpdir(), 'paycalc-city-policies')
    : resolve(process.argv[_outputIndex + 1])

const _attachmentPages = new Set([
  'https://rlsbt.zj.gov.cn/col/col1229506773/art/2026/art_2b4555c11a034b9e874038cbff2f84fb.html',
  'https://gjj.hangzhou.gov.cn/col/col1229468386/art/2026/art_09cee14331fb44f2967fca0b8ac2ce27.html',
])
const _weiboPost = 'https://www.sina.cn/news/detail/5252379494582133.html'
const _textChecks = new Map<string, string[]>([
  [
    'https://rlsbt.zj.gov.cn/col/col1229506773/art/2026/art_2b4555c11a034b9e874038cbff2f84fb.html',
    ['浙人社发〔2026〕52号', '102446'],
  ],
  [
    'https://rlsbt.zj.gov.cn/col/col1229101513/art/2026/art_e8b496ab59834390884b8d375cff1651.html',
    ['25611', '5122', '102446'],
  ],
  [
    'https://hrss.sz.gov.cn/xxgk/qtxx/tzgg/content/post_11091474.html',
    ['自2024年1月起，我市失业保险按照', '粤人社函〔2023〕133号'],
  ],
  [
    'https://hrss.sz.gov.cn/xxgk/qtxx/tzgg/content/post_12954949.html',
    ['从2026年9月1日起', '2700元/月'],
  ],
  ['https://www.sz.gov.cn/cn/xxgk/zfxxgj/tjsj/tjgb/content/mpost_12907800.html', ['193881']],
  ['https://www.gz.gov.cn/ysgz/xwdt/ysdt/content/post_11006324.html', ['0.2%', '政策执行至今']],
  [
    'https://tjj.gz.gov.cn/zzfwzq/tjgb/content/post_10894735.html',
    ['在岗职工年平均工资为171731元'],
  ],
  [
    'https://zhejiang.chinatax.gov.cn/art/2026/5/6/art_13129_654020.html',
    ['已于2025年12月31日截止', '无延续实施失业保险'],
  ],
  [
    'https://www.hangzhou.gov.cn/art/2024/6/7/art_1229063385_1843759.html',
    ['阶段性降低失业保险费率政策至2025年12月31日'],
  ],
  [
    'https://zhejiang.chinatax.gov.cn/art/2015/1/15/art_8410_12307.html',
    ['全省失业保险费率统一由3%调整为2%', '个人按照本人工资的0.5%'],
  ],
  ['https://gjj.gz.gov.cn/gkmlpt/content/10/10983/post_10983424.html', ['2680', '2026']],
])

function _isSource(url: string): boolean {
  const host = new URL(url).hostname
  return (
    host.endsWith('.gov.cn') ||
    host === 'www.shzfgjj.cn' ||
    host === 'www.sina.cn' ||
    host.endsWith('.sinaimg.cn')
  )
}

function _linkedSources(markdown: string): Map<string, string> {
  const sources = new Map<string, string>()
  for (const match of markdown.matchAll(/\[([^\]]+)\]\((https:\/\/[^)]+)\)/g)) {
    const [, label, url] = match
    if (_isSource(url) && !sources.has(url)) sources.set(url, label)
  }
  return sources
}

function _runCurl(url: string, path: string, extraArgs: string[] = []): Promise<CurlResult> {
  return new Promise((resolve) => {
    const args = [
      '--fail',
      '--location',
      '--retry',
      '2',
      '--connect-timeout',
      '10',
      '--max-time',
      '30',
      '--silent',
      '--show-error',
      '--user-agent',
      'Mozilla/5.0',
      ...(new URL(url).hostname.endsWith('.sinaimg.cn') ? ['--referer', _weiboPost] : []),
      ...extraArgs,
      '--output',
      path,
      '--write-out',
      '%{http_code}\t%{content_type}\t%{url_effective}',
      url,
    ]
    const child = spawn('curl', args)
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => (stdout += chunk))
    child.stderr.on('data', (chunk) => (stderr += chunk))
    child.on('close', (exitCode) =>
      resolve({ exitCode, stdout: stdout.trim(), stderr: stderr.trim() }),
    )
  })
}

function _extension(mime: string, url: string): string {
  if (mime === 'application/pdf') return '.pdf'
  if (mime === 'image/jpeg') return '.jpg'
  if (mime === 'image/png') return '.png'
  if (mime.startsWith('text/html')) return '.html'
  return extname(new URL(url).pathname) || '.bin'
}

function _verifyContent(url: string, mime: string, data: Buffer): void {
  if (mime === 'application/pdf' && !data.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    throw new Error('PDF signature mismatch')
  }
  if (mime === 'image/jpeg' && !data.subarray(0, 2).equals(Buffer.from([0xff, 0xd8]))) {
    throw new Error('JPEG signature mismatch')
  }
  if (mime.startsWith('text/html')) {
    const html = data.toString('utf8')
    if (!/<(?:!doctype\s+html|html\b)/i.test(html)) {
      throw new Error('HTML document marker missing')
    }
    const missing = (_textChecks.get(url) ?? []).filter((text) => !html.includes(text))
    if (missing.length) throw new Error(`Expected text missing: ${missing.join(', ')}`)
  }
}

async function _download(url: string, label: string): Promise<SourceResult> {
  const id = createHash('sha256').update(url).digest('hex').slice(0, 16)
  const temporaryPath = join(_outputDir, `${id}.download`)
  let response = await _runCurl(url, temporaryPath)
  if (response.exitCode !== 0 && response.stderr.includes('bad ecpoint')) {
    response = await _runCurl(url, temporaryPath, ['--curves', 'X25519'])
  }
  if (response.exitCode !== 0) {
    await rm(temporaryPath, { force: true })
    throw new Error(response.stderr || `curl exit ${response.exitCode}`)
  }

  const [status, mime, effectiveUrl] = response.stdout.split('\t')
  const data = await readFile(temporaryPath)
  _verifyContent(url, mime, data)
  const filename = `${id}${_extension(mime, url)}`
  await rename(temporaryPath, join(_outputDir, filename))
  return {
    label,
    url,
    effectiveUrl,
    status: Number(status),
    mime,
    bytes: data.length,
    sha256: createHash('sha256').update(data).digest('hex'),
    file: filename,
    reviewRequired: mime === 'application/pdf' || mime.startsWith('image/'),
  }
}

function _discoverAssets(source: SourceResult, html: string): Map<string, string> {
  const assets = new Map<string, string>()
  if (_attachmentPages.has(source.url)) {
    for (const match of html.matchAll(/\/cms_files\/filemanager\/[^\s"'<>]+?\.pdf/g)) {
      const url = new URL(match[0], source.url).href
      assets.set(url, `${source.label} — official PDF attachment`)
    }
  }
  if (source.url === _weiboPost) {
    for (const match of html.matchAll(
      /https?:\/\/wx\d+\.sinaimg\.cn\/(?:thumbnail|middle|large)\/[a-zA-Z0-9]+\.(?:jpg|jpeg|png)/g,
    )) {
      const url = match[0]
        .replace(/^http:/, 'https:')
        .replace(/\/(?:thumbnail|middle)\//, '/large/')
      assets.set(url, 'Guangzhou Tax Bureau medical insurance infographic')
    }
  }
  return assets
}

async function _fetchAll(sources: Map<string, string>): Promise<FetchResult> {
  const entries = [...sources]
  const results: SourceResult[] = []
  const failures: FetchFailure[] = []
  let next = 0

  async function worker() {
    while (next < entries.length) {
      const [url, label] = entries[next++]
      try {
        results.push(await _download(url, label))
      } catch (error) {
        failures.push({ label, url, error: String(error) })
      }
    }
  }

  await Promise.all(Array.from({ length: 4 }, worker))
  return { results, failures }
}

await mkdir(_outputDir, { recursive: true })
const _markdown = await readFile(_referencePath, 'utf8')
const _sources = _linkedSources(_markdown)
const _firstPass = await _fetchAll(_sources)
const _assets = new Map<string, string>()
for (const source of _firstPass.results) {
  if (!_attachmentPages.has(source.url) && source.url !== _weiboPost) continue
  const html = await readFile(join(_outputDir, source.file), 'utf8')
  for (const [url, label] of _discoverAssets(source, html)) {
    if (!_sources.has(url)) _assets.set(url, label)
  }
}
const _secondPass = await _fetchAll(_assets)
const _manifest = {
  fetchedAt: new Date().toISOString(),
  reference: _referencePath,
  sources: [..._firstPass.results, ..._secondPass.results].sort((a, b) =>
    a.url.localeCompare(b.url),
  ),
  failures: [..._firstPass.failures, ..._secondPass.failures],
}
await writeFile(join(_outputDir, 'manifest.json'), `${JSON.stringify(_manifest, null, 2)}\n`)
console.log(
  `Downloaded ${_manifest.sources.length} sources; ${_manifest.failures.length} failed. Manifest: ${join(_outputDir, 'manifest.json')}`,
)
if (_manifest.failures.length) process.exitCode = 1
