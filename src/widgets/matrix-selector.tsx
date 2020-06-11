import * as React from "react";
import * as ReactDOM from "react-dom";
import { Widget, Config } from "../widget";

/**
 * Mnemonics for the different matrices:
 *
 * D : direct result matrix based on 1 USD for each sector
 * U : matrix with upstream totals based on 1 USD for each sector
 * RD: direct result matrix based on a demand vector
 * RU: matrix with upstream totals based on a demand vector
 */
type Matrix = "D" | "U" | "RD" | "RU";

/**
 * A widget for selecting the underlying matrix of a heatmap.
 */
export class MatrixSelector extends Widget {

    constructor(private selector: string) {
        super();
        this.ready();
    }

    protected async handleUpdate(config: Config) {
        const matrix = matrixOf(config);
        ReactDOM.render(
            <Component
                selected={matrix}
                onChange={(m) => this.fireChange(update(config, m))} />,
            document.querySelector(this.selector)
        );
    }
}

/**
 * Determine the matrix type from the given configuration.
 */
function matrixOf(config: Config): Matrix {
    if (!config || !config.perspective)
        return "RU";
    if (config.perspective === "direct") {
        return !config.analysis
            ? "D"
            : "RD";
    }
    return !config.analysis
        ? "U"
        : "RU";
}

/**
 * Update the configuration based on the selected matrix.
 */
function update(config: Config, matrix: Matrix): Config {
    const conf = !config
        ? {}
        : { ...config };
    if (!matrix)
        return conf;

    // clear the analysis type for 1 USD based matrices
    if (matrix === "D" || matrix === "U") {
        conf.analysis = null;
        conf.perspective = matrix === "D"
            ? "direct"
            : "final";
        return conf;
    }

    // set the analysis type for result matrices to
    // Concumption if it is not present yet.
    if (!conf.analysis) {
        conf.analysis = "Consumption";
    }
    conf.perspective = matrix === "RD"
        ? "direct"
        : "final";
    return conf;
}

function labelOf(matrix: Matrix): string {
    switch (matrix) {
        case "D":
            return "Matrix D";
        case "U":
            return "Matrix U";
        case "RD":
            return "Direct result";
        case "RU":
            return "Upstream result";
    }
}

const Component = (props: {
    selected: Matrix,
    onChange: (matrix: Matrix) => void
}) => {

    const [showRepl, setShowRepl] = React.useState(false);

    const options = ["D", "U", "RD", "RU"].map((m: Matrix) => {
        return (
            <option value={m} key={m}>
                {labelOf(m)}
            </option>
        );
    });

    const content = showRepl
        ? <Repl matrix={props.selected} />
        : <Code matrix={props.selected}
            onShowRepl={() => setShowRepl(true)} />;

    return (
        <div>
            <div>
                <select value={props.selected}
                    onChange={e => props.onChange(e.target.value as Matrix)}>
                    {options}
                </select>
            </div>
            {content}
        </div>
    );
};

const Code = (props: { matrix: Matrix, onShowRepl: () => void }) => {
    return (
        <>
            <div style={{ float: "right", fontSize: "0.9em", padding: 5 }}>
                <a onClick={() => props.onShowRepl()}>
                    Run full example in a REPL
                </a>
            </div>
            <div style={{ clear: "both" }}>
                <pre>
                    <code>
                        {Snippet[props.matrix]}
                    </code>
                </pre>
            </div>
        </>
    );
};

const Snippet: { [matrix in Matrix]: string } = {

    "D": `
# The matrix D contains in each column j the impact assessment result that is
# related to the direct emissions and resources for 1 USD output from sector j.
#
# see also https://github.com/USEPA/USEEIO_API/blob/master/doc/data_format.md

B = get_matrix('B')
C = get_matrix('C')
D = C @ B
        `,

    "U": `
# The matrix U is a LCIA category x sector matrix and contains in each
# column j the total impact assessment result related to the direct and
# indirect emissions and resources that are required to produce 1 USD
# output of sector j.
#
# see also https://github.com/USEPA/USEEIO_API/blob/master/doc/data_format.md

D = get_matrix('D')
L = get_matrix('L')
U = D @ L
    `,

    "RD": `
# A result of the direct perspective contains in each column j the direct
# indicator result of a sector j related to a demand vector d.
#
# see also https://github.com/USEPA/USEEIO_API/blob/master/doc/data_format.md

U = get_matrix('U')

# we generate a random demand vector for this example, but typically you
# would load a demand vector from the USEEIO API
n = U.shape[1]
d = rand.random(n) * 1e6

# for the final result, we just scale the columns of U with d
RU = U @ numpy.diag(d)
    `,

    "RU": `
# A result of the final perspective is calculated by scaling the
# columns of the matrix U, which contains in each column j the
# total upstream result based on 1 USD of output of sector j, by
# the respective USD amounts of a demand vector d
#
# see also https://github.com/USEPA/USEEIO_API/blob/master/doc/data_format.md

U = get_matrix('U')

# we generate a random demand vector for this example, but typically you
# would load a demand vector from the USEEIO API
n = U.shape[1]
d = rand.random(n) * 1e6

# for the final result, we just scale the columns of U with d
RU = U @ numpy.diag(d)
    `,
};

const Repl = (props: { matrix: Matrix }) => {
    const url = `https://repl.it/@msrocka/useeioexamplesmatrix${props.matrix}?lite=true`;
    const atts = {
        frameborder: "no",
        allowtransparency: "true",
        allowfullscreen: "true",
    };
    return (
        <div style={{margin: 10}}>
            <iframe
                height="500px" width="100%" src={url}
                scrolling="no" {...atts}
                sandbox="allow-forms allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-modals">
            </iframe>
        </div>
    );
};