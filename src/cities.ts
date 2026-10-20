/** City contribution snapshots for ordinary enterprise employees, reviewed 2026-10-20. */
import { money } from './tax.ts'

export interface ContributionRule {
  name: string
  min: number
  max: number
  rate: number
  fixed?: number
  period: string
  reference?: string
}

export interface CityPolicy {
  id: string
  name: string
  rules: ContributionRule[]
  fund: { min: number; max: number; maxRate: number; period: string }
  notes: string[]
  sources: { title: string; url: string }[]
}

const guangdongPension = {
  name: '养老保险',
  min: 5521,
  max: 27603,
  rate: 8,
  period: '2026-07-01 起',
}
const guangdongSource = {
  title: '广东 2026 年养老基数通知',
  url: 'https://hrss.gd.gov.cn/zwgk/xxgkml/bmwj/qtwj/shbz/content/post_4956863.html',
}
export const CITIES: CityPolicy[] = [
  {
    id: 'beijing',
    name: '北京',
    rules: [
      { name: '养老保险', min: 7270, max: 36348, rate: 8, period: '2026-07-01 起' },
      {
        name: '医疗保险',
        min: 7270,
        max: 36348,
        rate: 2,
        fixed: 3,
        period: '2026-07-01 起；含每月 3 元互助资金',
      },
      { name: '失业保险', min: 7270, max: 36348, rate: 0.5, period: '2026-07-01 起基数' },
    ],
    fund: { min: 2540, max: 36348, maxRate: 12, period: '2026-07 至 2027-06' },
    notes: ['仅普通企业在职职工；领取基本生活费等特殊公积金下限不在此预设范围内。'],
    sources: [
      {
        title: '北京 2026 年社保基数',
        url: 'https://rsj.beijing.gov.cn/xxgk/2024zcwj/202608/t20260821_4831461.html',
      },
      {
        title: '北京 2026 年公积金标准',
        url: 'https://www.beijing.gov.cn/fwcj/jiage/zffw1/685cd52595ff563574309b82.html',
      },
      {
        title: '北京市商务局 2026 年投资指南（社保费率）',
        url: 'https://sw.beijing.gov.cn/zwxx/swxx/202605/P020260512520283489932.pdf',
      },
    ],
  },
  {
    id: 'shanghai',
    name: '上海',
    rules: [
      { name: '养老保险', min: 7546, max: 37731, rate: 8, period: '2026-07-01 起' },
      { name: '医疗保险', min: 7546, max: 37731, rate: 2, period: '2026-07-01 起基数' },
      {
        name: '失业保险',
        min: 7546,
        max: 37731,
        rate: 0.5,
        period: '2026-07-01 起基数',
        reference: '0.5% 为最近已查到的个人费率；2026 年续期条款需复核。',
      },
    ],
    fund: { min: 2740, max: 37731, maxRate: 7, period: '2026-07 至 2027-06' },
    notes: ['普通公积金比例 5%—7%；自愿补充公积金可另选 1%—5%，默认不缴。'],
    sources: [
      {
        title: '上海 2026 年社保基数',
        url: 'https://rsj.sh.gov.cn/tdjjf_17554/20260824/t0035_1443297.html',
      },
      {
        title: '上海 2026 年公积金通知',
        url: 'https://www.shzfgjj.cn/html/newxxgk/zcwj/gfxwj/228478.html',
      },
      {
        title: '上海职工社保个人比例',
        url: 'https://rsj.sh.gov.cn/tdjjf_17554/20200828/t0035_1393484.html',
      },
      {
        title: '上海失业保险费率文件',
        url: 'https://rsj.sh.gov.cn/tshbx_17729/20250103/t0035_1429759.html',
      },
    ],
  },
  {
    id: 'shenzhen',
    name: '深圳',
    rules: [
      { ...guangdongPension },
      {
        name: '医疗保险',
        min: 6727,
        max: 33633,
        rate: 2,
        period: '2026-01 至 2026-12；一档 2%，二档 0.5%',
      },
      {
        name: '失业保险',
        min: 2700,
        max: 48471,
        rate: 0.2,
        period: '2026-09 起下限',
        reference: '上限按 2025 年在岗月均工资 × 3 推算，非经办系统核定值。',
      },
    ],
    fund: {
      min: 2520,
      max: 48471,
      maxRate: 12,
      period: '2026-07 至 2027-06；9 月起新入职下限 2700',
    },
    notes: [
      '深户职工应选医保一档；非深户按单位参保方案选择一档或二档。',
      '公积金上限依据税务通告转载；官方原文访问受限，需复核。9 月起新入职或新调入职工请选择对应选项。',
    ],
    sources: [
      guangdongSource,
      {
        title: '深圳 2026 年医保基数',
        url: 'https://www.sz.gov.cn/hdjlpt/detail?pid=3336522&via=pc',
      },
      {
        title: '深圳医保一档、二档费率',
        url: 'https://hsa.sz.gov.cn/gkmlpt/content/10/10979/post_10979462.html',
      },
      { title: '深圳公积金年度基数规则', url: 'https://zjj.sz.gov.cn/zcjzts/' },
      {
        title: '深圳 9 月起新入职公积金下限',
        url: 'https://zjj.sz.gov.cn/hdjl/ywzs/gjj/content/post_12977660.html',
      },
      {
        title: '深圳公积金税前扣除上限原文（访问受限）',
        url: 'https://shenzhen.chinatax.gov.cn/sztax/xxgk/tzgg/202609/c6b762960af44d4c855d8cd0e58646b1.shtml',
      },
      { title: '深圳税务通告转载（上限复核线索）', url: 'https://law.esnai.cn/mview/234828/' },
    ],
  },
  {
    id: 'guangzhou',
    name: '广州',
    rules: [
      { ...guangdongPension },
      {
        name: '医疗保险',
        min: 6234,
        max: 31170,
        rate: 2,
        period: '2026 年参考',
        reference: '基数 6,234—31,170 为待复核参考值；官方已确认 60%—300% 规则及个人 2% 费率。',
      },
      {
        name: '失业保险',
        min: 2680,
        max: 42933,
        rate: 0.2,
        period: '2026-09 起下限',
        reference: '上限按 2025 年在岗月均工资 × 3 取整推算，非直接公布值。',
      },
    ],
    fund: { min: 2680, max: 41697, maxRate: 12, period: '2026-07 至 2027-06；9 月起下限 2680' },
    notes: [
      '各险种单独计算基数；医保参考上下限需按工资条或经办系统复核。',
      '公积金 9 月下限调整依据公积金中心通知的广州日报报道；对应官方调整原文待补。',
    ],
    sources: [
      guangdongSource,
      {
        title: '广州职工医保筹资规则与费率',
        url: 'https://www.gz.gov.cn/gfxwj/sbmgfxwj/gzsylbzj/content/post_8689834.html',
      },
      {
        title: '广州 2026 年失业个人费率说明',
        url: 'https://www.gz.gov.cn/ysgz/xwdt/ysdt/content/post_11006324.html',
      },
      {
        title: '广州 2026 年公积金调整通知',
        url: 'https://gjj.gz.gov.cn/gg/tzgg/content/post_10879601.html',
      },
      {
        title: '广州公积金 9 月下限调整报道',
        url: 'https://newspaper.gzdaily.cn/pc/html/2026-08/29/content_869_914015.htm',
      },
      {
        title: '广州 2025 年在岗平均工资',
        url: 'https://tjj.gz.gov.cn/stats_newtjyw/tjsj/tjgb/qtgb/content/mpost_10894378.html',
      },
    ],
  },
  {
    id: 'hangzhou',
    name: '杭州',
    rules: [
      {
        name: '养老保险',
        min: 5122,
        max: 25611,
        rate: 8,
        period: '2026-01 起（10 月发布）',
        reference: '2026 年基数按通知转载整理，省厅原文访问受限，需复核。',
      },
      {
        name: '医疗保险',
        min: 5122,
        max: 25611,
        rate: 2,
        period: '2026 年',
        reference: '按同年度省平工资 60%—300% 推算；实际调基和补差以医保系统为准。',
      },
      {
        name: '失业保险',
        min: 5122,
        max: 25611,
        rate: 0.5,
        period: '2026 年参考',
        reference: '最近已查到的个人费率 0.5%，2026 年续期文件待复核。',
      },
    ],
    fund: { min: 2660, max: 42151, maxRate: 12, period: '2026-07 至 2027-06；杭州市区' },
    notes: [
      '公积金按杭州公积金中心通知的杭州网转载整理；中心原文访问受限。',
      '仅杭州市区；桐庐、淳安、建德公积金下限 2430 元，不在本预设范围内。大病与长护险个人账户划转不重复计入工资现金代扣。',
    ],
    sources: [
      {
        title: '浙江 2026 年社保基数原文（访问受限）',
        url: 'https://rlsbt.zj.gov.cn/col/col1229506773/art/2026/art_2b4555c11a034b9e874038cbff2f84fb.html',
      },
      {
        title: '浙江基数通知转载（复核线索）',
        url: 'https://hz.bendibao.com/live/2026109/173298.shtm',
      },
      {
        title: '杭州医保办法（政府公报）',
        url: 'https://zfgb.hangzhou.gov.cn/upload/default/bigfile/2025/10/15/20251015_ec3d3e35772bc2a066570411d334c03f.pdf',
      },
      {
        title: '杭州公积金调整原文（访问受限）',
        url: 'https://gjj.hangzhou.gov.cn/col/col1229468386/art/2026/art_09cee14331fb44f2967fca0b8ac2ce27.html',
      },
      {
        title: '杭州公积金中心通知转载',
        url: 'https://hznews.hangzhou.com.cn/jingji/content/2026-07/25/content_9263759.htm',
      },
      {
        title: '杭州失业费率历史文件',
        url: 'https://zfgb.hangzhou.gov.cn/10/105220253/t121220253054/519465.shtml',
      },
    ],
  },
]

export interface CitySettings {
  wage: string
  fundWage: string
  fundRate: string
  supplement: string
  medicalTier: string
  newEmployee: boolean
}
export const INITIAL_CITY_SETTINGS: CitySettings = {
  wage: '',
  fundWage: '',
  fundRate: '7',
  supplement: '0',
  medicalTier: '1',
  newEmployee: false,
}

/** Estimate a constant month using per-branch bounds; do not imply historical annual settlement. */
export function calculateContributions(
  city: CityPolicy,
  wage: number,
  fundWage: number,
  settings: CitySettings,
) {
  const rows = city.rules.map((rule) => {
    const base = Math.min(rule.max, Math.max(rule.min, wage))
    const rate =
      city.id === 'shenzhen' && rule.name === '医疗保险' && settings.medicalTier === '2'
        ? 0.5
        : rule.rate
    return {
      name: rule.name,
      base,
      rate,
      fixed: rule.fixed ?? 0,
      amount: money((base * rate) / 100 + (rule.fixed ?? 0)),
    }
  })
  const floor = city.id === 'shenzhen' && settings.newEmployee ? 2700 : city.fund.min
  const base = Math.min(city.fund.max, Math.max(floor, fundWage))
  // Provident fund estimates round each personal monthly contribution to whole yuan.
  rows.push({
    name: '住房公积金',
    base,
    rate: Number(settings.fundRate),
    fixed: 0,
    amount: Math.round((base * Number(settings.fundRate)) / 100),
  })
  if (city.id === 'shanghai' && Number(settings.supplement) > 0) {
    rows.push({
      name: '补充公积金',
      base,
      rate: Number(settings.supplement),
      fixed: 0,
      amount: Math.round((base * Number(settings.supplement)) / 100),
    })
  }
  const monthly = money(rows.reduce((total, row) => total + row.amount, 0))
  return { rows, monthly, annual: money(monthly * 12) }
}
