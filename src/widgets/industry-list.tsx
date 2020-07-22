import * as React from "react";
import * as ReactDOM from "react-dom";

import * as colors from "../util/colors";
import * as strings from "../util/strings";
import * as conf from "../config";

import { Widget, Config } from "../widget";
import {
    Indicator,
    IndicatorGroup,
    Model,
    Sector,
} from "../webapi";
import { HeatmapResult } from "../calc/heatmap-result";
import { MatrixCombo } from "./matrix-selector";
import { ones } from "../calc/calc";
import * as naics from "../naics";

const INDICATOR_GROUPS = [
    IndicatorGroup.IMPACT_POTENTIAL,
    IndicatorGroup.RESOURCE_USE,
    IndicatorGroup.CHEMICAL_RELEASES,
    IndicatorGroup.WASTE_GENERATED,
    IndicatorGroup.ECONOMIC_SOCIAL,
];

export class IndustryList extends Widget {

    /**
     * The current configuration of the heatmap.
     */
    config: Config;

    result: HeatmapResult;
    demand: { [code: string]: number };
    indicators: Indicator[];

    /**
     * The industry sectors of the model. This array is only initialized and
     * thus should be only used when this heatmap has no results.
     */
    sectors: Sector[];

    private _naicsAttr: string;

    constructor(private model: Model, private selector: string) {
        super();
        this.ready();
        const parent = document.querySelector(selector);
        if (parent) {
            this._naicsAttr = parent.getAttribute("data-naics");
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    if (mutation.attributeName === "data-naics") {
                        const naicsAttr = parent.getAttribute("data-naics");
                        const config: Config = this.config
                            ? { ... this.config }
                            : {};
                        config.naics = naicsAttr
                            ? naicsAttr.split(",").map(code => code.trim())
                            : undefined;
                        this.handleUpdate(config);
                    }
                });
            });
            observer.observe(parent, {
                attributeFilter: ["data-naics"],
            });
        }
    }

    protected async handleUpdate(config: Config) {

        // run a new calculation if necessary
        const needsCalc = this.needsCalculation(this.config, config);

        this.config = { ...config };
        if (!this.config.naics && this._naicsAttr) {
            this.config.naics = this._naicsAttr
                .split(",")
                .map(code => code.trim());
        }

        if (needsCalc) {
            this.result = await calculate(this.model, config);
        }
        if (!this.result) {
            // initialize the sector array
            const { sectors } = await this.model.singleRegionSectors();
            this.sectors = sectors;
        }

        // load the demand vector if required
        if (config.showvalues && (!this.demand || needsCalc)) {
            const demandID = await this.model.findDemand(config);
            const demand = await this.model.demand(demandID);
            if (demand) {
                const values: { [id: string]: number } = {};
                demand.forEach(e => values[e.sector] = e.amount);
                // this aggregates the demand values by sector
                // code for multi-regional models
                this.demand = {};
                for (const sector of (await this.model.sectors())) {
                    const val = values[sector.id];
                    if (!val) {
                        continue;
                    }
                    const sum = this.demand[sector.code];
                    this.demand[sector.code] = sum
                        ? sum + val
                        : val;
                }
            }
        }

        this.indicators = await this.syncIndicators(config);

        ReactDOM.render(
            <Component widget={this} />,
            document.querySelector(this.selector));
    }

    private needsCalculation(oldConfig: Config, newConfig: Config) {
        if (!newConfig || !strings.isMember("mosaic", newConfig.view))
            return false;

        if (!oldConfig || !this.result) {
            return true;
        }
        // changes in these fields trigger a calculation
        const fields = [
            "view",
            "perspective",
            "analysis",
            "year",
            "location",
            "view"
        ];
        for (const field of fields) {
            if (oldConfig[field] !== newConfig[field]) {
                return true;
            }
        }
        return false;
    }

    private async syncIndicators(config: Config): Promise<Indicator[]> {
        if (!strings.isMember("mosaic", config.view)) {
            return [];
        }
        const all = await this.model.indicators();
        if (!all || all.length === 0) {
            return [];
        }

        // filter indicators by configuration codes
        let codes = config.indicators;
        if (!codes || codes.length === 0) {
            codes = conf.DEFAULT_INDICATORS;
        }
        const indicators = all.filter(i => codes.indexOf(i.code) >= 0);
        if (indicators.length <= 1) {
            return indicators;
        }

        // sort indicators by groups and names
        indicators.sort((i1, i2) => {
            if (i1.group === i2.group) {
                return strings.compare(i1.code, i2.code);
            }
            const ix1 = INDICATOR_GROUPS.findIndex(g => g === i1.group);
            const ix2 = INDICATOR_GROUPS.findIndex(g => g === i2.group);
            return ix1 - ix2;
        });
        return indicators;
    }
}

async function calculate(model: Model, config: Config): Promise<HeatmapResult> {

    // for plain matrices => wrap the matrix into a result
    if (!config.analysis) {
        const M = config.perspective === "direct"
            ? await model.matrix("D")
            : await model.matrix("U");
        const indicators = await model.indicators();
        const sectors = await model.sectors();
        return HeatmapResult.from(model, {
            data: M.data,
            totals: ones(indicators.length),
            indicators: indicators.map(i => i.code),
            sectors: sectors.map(s => s.id),
        });
    }

    // run a calculation
    const demand = await model.findDemand(config);
    const result = await model.calculate({
        perspective: config.perspective,
        demand: await model.demand(demand),
    });
    return HeatmapResult.from(model, result);
}

const Component = (props: { widget: IndustryList }) => {

    const config = props.widget.config;
    const [sorter, setSorter] = React.useState<Indicator | null>(null);
    const [searchTerm, setSearchTerm] = React.useState<string | null>(null);

    const indicators = props.widget.indicators;
    const result = props.widget.result;

    // create the sector ranking
    let ranking: [Sector, number][] = result
        ? result.getRanking(sorter ? [sorter] : indicators)
        : props.widget.sectors.map(s => [s, 0]);
    if (searchTerm) {
        ranking = ranking.filter(
            ([s,]) => strings.search(s.name, searchTerm) >= 0);
    }
    ranking.sort(([s1, rank1], [s2, rank2]) =>
        rank1 === rank2
            ? strings.compare(s1.name, s2.name)
            : rank2 - rank1);

    // select the page
    const count = config.count;
    if (count && count >= 0) {
        const page = config.page;
        if (page <= 1) {
            ranking = ranking.slice(0, count);
        } else {
            const offset = (page - 1) * count;
            ranking = offset < ranking.length
                ? ranking.slice(offset, offset + count)
                : ranking.slice(0, count);
        }
    }

    const rows: JSX.Element[] = ranking.map(([sector, rank]) =>
        <Row key={sector.code}
            sector={sector}
            sortIndicator={sorter}
            widget={props.widget}
            rank={rank} />
    );

    return (
        <>
            {
                // display the matrix selector if we display a result
                config.selectmatrix && props.widget.result
                    ? <MatrixCombo config={config} widget={props.widget} />
                    : <></>
            }
            {
                // display download links if this is configured
                config.showdownload
                    ? <DownloadSection widget={props.widget} />
                    : <></>
            }
            <table style={{
                marginRight: "80px"
            }}>
                <thead>
                    <tr className="indicator-row">
                        <Header
                            widget={props.widget}
                            count={ranking.length}
                            onSearch={term => setSearchTerm(term)} />

                        { // optional demand column
                            config.showvalues
                                ? <th><div><span>Demand</span></div></th>
                                : <></>
                        }

                        <IndicatorHeader
                            indicators={indicators}
                            onClick={(i) => setSorter(
                                sorter === i ? null : i
                            )} />

                        { // optional column with ranking values
                            strings.isMember("ranking", config.view)
                                ? <th><div><span>Ranking</span></div></th>
                                : <></>
                        }
                    </tr>
                </thead>
                <tbody className="industry-list-body">
                    {rows}
                </tbody>
            </table>
        </>
    );
};

const Header = (props: {
    widget: IndustryList,
    count: number,
    onSearch: (term: string | null) => void,
}) => {

    const total = props.widget.result?.sectors?.length
        || props.widget.sectors?.length;

    const onSearch = (value: string) => {
        if (!value) {
            props.onSearch(null);
            return;
        }
        const term = value.trim().toLowerCase();
        props.onSearch(term.length === 0 ? null : term);
    };

    return (
        <th>
            <div>
                <Paginator total={total} widget={props.widget} />
                <input className="matrix-search" type="search" placeholder="Search"
                    onChange={e => onSearch(e.target.value)}>
                </input>
            </div>
        </th>
    );
};

const IndicatorHeader = (props: {
    indicators: Indicator[],
    onClick: (i: Indicator) => void
}) => {

    // no indicators
    if (!props.indicators || props.indicators.length === 0) {
        return <></>;
    }

    // single indicator
    if (props.indicators.length === 1) {
        const indicator = props.indicators[0];
        return (
            <th className="indicator" key={indicator.code}>
                <div>
                    <a>{indicator.name} ({indicator.code})</a>
                </div>
            </th>
        );
    }

    // multiple indicators with groups
    const items: JSX.Element[] = [];
    let g: IndicatorGroup | null = null;
    for (const indicator of props.indicators) {
        // group header
        if (indicator.group !== g) {
            g = indicator.group;
            const gkey = g ? `group-${INDICATOR_GROUPS.indexOf(g)}` : "null";
            items.push(
                <th key={gkey} className="indicator">
                    <div className="indicator-group-parent">
                        <span className="indicator-group">
                            <b>{g}</b>
                        </span>
                    </div>
                </th>
            );
        }

        // indicator header
        const key = `<indicator-${indicator.code}`;
        items.push(
            <th key={key} className="indicator">
                <div>
                    <a onClick={() => props.onClick(indicator)}>
                        {indicator.name} ({indicator.code})
                    </a>
                </div>
            </th>
        );
    }
    return <>{items}</>;
};

type RowProps = {
    sector: Sector,
    sortIndicator: Indicator | null,
    widget: IndustryList,
    rank?: number,
};

const Row = (props: RowProps) => {

    const config = props.widget.config;
    const sector = props.sector;

    // determine if the sector is selected
    let selected = false;
    if (config.sectors) {
        // the code of the sector is in the sector list of
        // the widget configuration
        selected = config.sectors.indexOf(sector.code) >= 0;
    } else if (config.naics) {
        // there is no sector list in the configuration but
        // maybe a matching NAICS code
        for (const code of config.naics) {
            if (naics.toBEA(code) === sector.code) {
                selected = true;
                break;
            }
        }
    }

    // the selection handler of the sector
    const onSelect = () => {
        let codes = config.sectors
            ? config.sectors.slice(0)
            : null;
        if (!codes && !config.naics) {
            codes = [sector.code];
        } else if (codes) {
            // there is a sector configuration
            if (selected) {
                const idx = codes.indexOf(sector.code);
                codes.splice(idx, 1);
            } else {
                codes.push(sector.code);
            }
        } else if (config.naics) {
            // create a sector configuration from NAICS codes
            codes = selected ? [] : [sector.code];
            for (const naicsCode of config.naics) {
                const code = naics.toBEA(naicsCode);
                if (!code) {
                    continue;
                }
                if (selected && code === sector.code) {
                    continue;
                }
                codes.push(code);
            }
        }
        props.widget.fireChange({ sectors: codes });
    };

    // display the demand value if showvalues=true
    let demand;
    if (config.showvalues) {

        // demand value
        const demandVal = props.widget.demand[sector.code];
        demand = <td style={{
            borderTop: "lightgray solid 1px",
            padding: "5px 0px",
            whiteSpace: "nowrap",
        }}>
            {demandVal ? demandVal.toFixed(3) : null}
        </td>;
    }

    // display the ranking value if view=ranking
    let rank;
    if (strings.isMember("ranking", config.view)) {
        rank = <td style={{
            borderTop: "lightgray solid 1px",
            padding: "5px 0px",
            whiteSpace: "nowrap",
        }}>
            {props.rank ? props.rank.toFixed(3) : null}
        </td>;
    }

    const sectorLabel = `${sector.code} - ${sector.name}`;
    return (
        <tr>
            <td key={props.sector.code}
                style={{
                    borderTop: "lightgray solid 1px",
                    padding: "5px 0px",
                    whiteSpace: "nowrap",
                }}>
                <div style={{ cursor: "pointer" }}>
                    <input type="checkbox"
                        checked={selected}
                        onChange={onSelect}>
                    </input>

                    <a title={sectorLabel}
                        onClick={onSelect}>
                        {strings.cut(sectorLabel, 80)}
                    </a>
                </div>
            </td>
            {config.showvalues ? demand : <></>}
            <IndicatorResult {...props} />
            {rank ? rank : <></>}
        </tr>
    );
};

/**
 * Appends possible indicator result columns to a row in the heatmap. If no
 * indicators are in the selection, nothing is appended. For a single indicator
 * a result bar is rendered and when there are multiple indicators in the
 * selection mosaic cells are appended.
 */
const IndicatorResult = (props: RowProps) => {

    const config = props.widget.config;
    const indicators = props.widget.indicators;
    const result = props.widget.result;
    if (!indicators || indicators.length === 0 || !result) {
        return <></>;
    }

    // render a bar when a single indicator is selected
    if (indicators.length === 1) {
        const ind = indicators[0];
        const color = colors.forIndicatorGroup(ind.group);
        const r = result.getResult(ind, props.sector);
        const share = result.getShare(ind, props.sector);
        return (
            <td key={ind.id}>
                <div>
                    <span style={{ float: "left" }}>
                        {`${config.showscientific ? r.toExponential(2) : r.toFixed(3)} ${ind.unit}`}
                    </span>
                    <svg height="15" width="210"
                        style={{ float: "left", clear: "both" }}>
                        <rect x="0" y="2.5"
                            height="10" fill={color}
                            width={200 * (0.1 + 0.9 * share)} />
                    </svg>
                </div>
            </td>
        );
    }

    // render mosaic cells
    const items: JSX.Element[] = [];
    let g: IndicatorGroup | null = null;
    for (const ind of indicators) {
        if (ind.group !== g) {
            // add an empty grey cell for the group
            const gkey = g ? `group-${INDICATOR_GROUPS.indexOf(g)}` : "null";
            g = ind.group;
            items.push(<td key={gkey} className="noborder" />);
        }
        const r = result.getResult(ind, props.sector);
        const share = result.getShare(ind, props.sector);
        let alpha = 0.1 + 0.9 * share;
        if (props.sortIndicator && props.sortIndicator !== ind) {
            alpha *= 0.25;
        }
        const color = colors.forIndicatorGroup(ind.group, alpha);
        const value = `${config.showscientific ? r.toExponential(2) : r.toFixed(3)} ${ind.unit}`;
        items.push(
            <td className="indicator-value" key={ind.id}
                title={value}
                style={{ backgroundColor: color }}>
                {config.showvalues ? value : ""}
            </td>
        );
    }
    return <>{items}</>;
};

const DownloadSection = (props: {
    widget: IndustryList,
}) => {

    const onDownload = (format: "CSV" | "JSON") => {

        let text: string;
        const w = props.widget;
        const ranking: [Sector, number][] = w.result
            ? w.result.getRanking(w.indicators)
            : w.sectors.map(s => [s, 0]);

        if (format === "JSON") {

            // create JSON download
            type JsonType = {
                sectors: Sector[],
                indicators?: Indicator[],
                result?: number[][],
                demand?: { [code: string]: number },
            };
            const json: JsonType = {
                sectors: ranking.map(([s,]) => s),
                indicators: w.indicators,
                result: w.result?.result?.data,
                demand: w.demand,
            };
            text = JSON.stringify(json, null, "  ");

        } else {

            // create CSV download
            text = "sector code,sector name";
            if (w.demand) {
                text += ",demand";
            }
            if (w.result && w.indicators) {
                for (const i of w.indicators) {
                    text += `,"${i.code} - ${i.name} [${i.unit}]"`;
                }
                text += ",ranking";
            }
            text += "\n";

            for (const [sector, rank] of ranking) {
                text += `"${sector.code}","${sector.name}"`;
                if (w.demand) {
                    text += `,${w.demand[sector.code]}`;
                }
                if (w.result && w.indicators) {
                    for (const i of w.indicators) {
                        text += `,${w.result.getResult(i, sector)}`;
                    }
                    text += `,${rank}`;
                }
                text += "\n";
            }
        }

        // download file
        // see https://stackoverflow.com/a/33542499
        const blob = new Blob([text], {
            type: format === "JSON"
                ? "application/json"
                : "text/csv",
        });
        const file = format === "JSON"
            ? "heatmap.json"
            : "heatmap.csv";
        if (window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveOrOpenBlob(blob, file);
        } else {
            const elem = window.document.createElement("a");
            const url = window.URL.createObjectURL(blob);
            elem.href = url;
            elem.download = file;
            document.body.appendChild(elem);
            elem.click();
            document.body.removeChild(elem);
        }
    };

    return (
        <div className="download-section">
            <span>Download: </span>
            <a className="download-link"
                onClick={() => onDownload("JSON")}>
                JSON
            </a>
            <span> | </span>
            <a className="download-link"
                onClick={() => onDownload("CSV")}>
                CSV
            </a>
        </div>
    );
};

const Paginator = (props: {
    total: number,
    widget: IndustryList,
}) => {

    const [showCounter, setShowCounter] = React.useState<boolean>(false);

    // calculate the page count
    const total = props.total;
    const config = props.widget.config;
    let count = config.count || -1;
    if (count > total) {
        count = total;
    }
    const pageCount = count > 0
        ? Math.ceil(total / count)
        : 0;

    // select the page
    let page = config.page || 1;
    if (page <= 0) {
        page = 1;
    }
    if (page > pageCount) {
        page = pageCount;
    }

    // page links
    const links: JSX.Element[] = [];
    const goTo = (nextPage: number) => {
        props.widget.fireChange({ page: nextPage });
    };
    if (page > 1) {
        links.push(
            <a key="paginator-prev"
                onClick={() => goTo(page - 1)}>
                Previous
            </a>
        );
    }
    const start = page > 3 ? page - 2 : 1;
    let end = start + 4;
    if (end > pageCount) {
        end = pageCount;
    }
    for (let i = start; i <= end; i++) {
        if (links.length > 0) {
            links.push(
                <span key={`paginator-sep-${i}`}
                    style={{ margin: "0 3px" }}>
                    |
                </span>
            );
        }
        if (i === page) {
            links.push(
                <span key={`paginator-${i}`}>
                    {i}
                </span>);
        } else {
            links.push(
                <a key={`paginator-${i}`}
                    onClick={() => goTo(i)}>
                    {i}
                </a>
            );
        }
    }
    if (page < pageCount) {
        links.push(
            <span key={`paginator-sep-next`}
                style={{ margin: "0 3px" }}>
                |
            </span>
        );
        links.push(
            <a key={`paginator-next`}
                onClick={() => goTo(page + 1)}>
                Next
            </a>
        );
    }

    // title
    const title = count > 0 && count < total
        ? `${count} of ${total} -- `
        : `${total} industry sectors`;


    // counter combo
    const counter: JSX.Element[] = [];
    if (!showCounter) {
        counter.push(
            <span
                key="paginator-arrowdown"
                className="arrowdown"
                style={{ cursor: "pointer" }}
                onClick={() => setShowCounter(true)} />
        );
    } else {
        const options = [-1, 10, 20, 30, 40, 50, 100].map(i => {
            const text = i === -1 ? "All" : i;
            return (
                <option value={i} key={`count-prop-${i}`}>
                    {text}
                </option>
            );
        });
        counter.push(
            <select
                key="paginator-counter"
                value={count}
                style={{ float: "right" }}
                onChange={(e) => {
                    const c = parseInt(e.target.value, 10);
                    props.widget.fireChange({ count: c });
                }}>
                {options}
            </select>
        );
        counter.push(
            <span
                key="paginator-arrowright"
                className="arrowright"
                style={{ cursor: "pointer" }}
                onClick={() => setShowCounter(false)} />
        );
    }

    return (
        <span className="matrix-sub-title">
            {title}
            {links}
            {counter}
        </span>
    );
};