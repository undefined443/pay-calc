/** Controls and evidence for city-specific employee contribution estimates. */

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CITIES, type CityPolicy, type CitySettings, calculateContributions } from './cities'

const format = (amount: number) => amount.toLocaleString('zh-CN', { maximumFractionDigits: 2 })

interface Props {
  city: CityPolicy | undefined
  settings: CitySettings
  referenceWage: number
  onCityChange: (id: string) => void
  onSettingsChange: (settings: CitySettings) => void
}

/** Keep automatic estimates explicit and preserve the separate manual contribution mode. */
export function CityContributions({
  city,
  settings,
  referenceWage,
  onCityChange,
  onSettingsChange,
}: Props) {
  const estimate = city
    ? calculateContributions(
        city,
        Number(settings.wage || referenceWage),
        Number(settings.wage || referenceWage),
        settings,
      )
    : null
  return (
    <section className="city-controls" aria-label="城市缴费设置">
      <div className="field">
        <Label htmlFor="city-select">参保城市</Label>
        <Select value={city?.id ?? 'manual'} onValueChange={onCityChange}>
          <SelectTrigger id="city-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">自行输入</SelectItem>
            {CITIES.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <small>选择城市按当地规则估算；自行输入全年实缴金额。</small>
      </div>
      {city && estimate && (
        <>
          <div className="field-grid city-wage-fields">
            <div className="field">
              <Label htmlFor="social-average-wage">上年度月平均工资</Label>
              <Input
                id="social-average-wage"
                type="number"
                min="0"
                step="0.01"
                placeholder={format(referenceWage)}
                value={settings.wage}
                onChange={(event) => onSettingsChange({ ...settings, wage: event.target.value })}
              />
            </div>
            <div className="field city-fund-rate">
              <Label htmlFor="fund-rate">公积金个人比例</Label>
              <Select
                value={settings.fundRate}
                onValueChange={(fundRate) => onSettingsChange({ ...settings, fundRate })}
              >
                <SelectTrigger id="fund-rate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: city.fund.maxRate - 4 }, (_, index) => index + 5).map(
                    (rate) => (
                      <SelectItem key={rate} value={String(rate)}>
                        {rate}%
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="city-scope">默认按当前月薪估算，社保和公积金使用相同工资。</p>
          <section className="city-contribution-table" aria-label="缴费明细">
            <Table>
              <colgroup>
                <col style={{ width: '25%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '26%' }} />
                <col style={{ width: '24%' }} />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>项目</TableHead>
                  <TableHead>计缴基数</TableHead>
                  <TableHead>个人比例</TableHead>
                  <TableHead>月缴费</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estimate.rows.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>¥ {format(row.base)}</TableCell>
                    <TableCell>
                      {format(row.rate)}%{row.fixed > 0 && ` + ¥ ${format(row.fixed)}`}
                    </TableCell>
                    <TableCell>¥ {format(row.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
          <div className="city-total">
            <span>五险一金个人缴费估算</span>
            <strong>¥ {format(estimate.annual)} / 年</strong>
            <small>¥ {format(estimate.monthly)} / 月 · 已联动税后计算</small>
          </div>
        </>
      )}
    </section>
  )
}
