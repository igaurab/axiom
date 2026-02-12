"""Generate accuracy bar charts using plotperfect."""

import io

import plotperfect as S
from matplotlib.patches import Patch

from schemas.schemas import GradeCountsOut


def generate_accuracy_chart(
    runs: list[dict],
) -> bytes:
    """
    Generate a grouped bar chart PNG for accuracy data.

    Parameters
    ----------
    runs : list of {"label": str, "grade_counts": GradeCountsOut}

    Returns PNG bytes.
    """
    S.apply_style()

    import numpy as np

    categories = ["Correct", "Partial", "Wrong"]
    series_colors = [S.PALETTE[0], S.PALETTE[1], S.PALETTE[3]]  # blue, orange, red
    series_hatches = [S.HATCHES[0], S.HATCHES[1], S.HATCHES[2]]

    if len(runs) == 1:
        # Single run: 3 bars side by side
        gc = runs[0]["grade_counts"]
        values = [gc.correct, gc.partial, gc.wrong]
        fig, ax = S.new_figure(figsize=(8, 6))

        x = np.arange(len(categories))
        bars = ax.bar(
            x, values,
            width=S.BAR_WIDTH,
            color=series_colors,
            edgecolor=S.HATCH_COLOR,
            linewidth=S.BAR_EDGE_WIDTH,
            hatch=[series_hatches[i] for i in range(3)],
        )
        S.annotate_bars(ax, bars, values, total=gc.total)
        ax.set_xticks(x)
        ax.set_xticklabels(categories)
        S.style_ax(
            ax,
            title=f"Accuracy — {runs[0]['label']}",
            ylabel="Count",
        )
        handles = [
            Patch(facecolor=series_colors[i], hatch=series_hatches[i],
                  edgecolor=S.HATCH_COLOR, linewidth=S.BAR_EDGE_WIDTH,
                  label=categories[i])
            for i in range(3)
        ]
        S.add_legend(ax, handles=handles)
    else:
        # Compare: grouped bars — categories = run labels, 3 series
        labels = [r["label"] for r in runs]
        correct_vals = [r["grade_counts"].correct for r in runs]
        partial_vals = [r["grade_counts"].partial for r in runs]
        wrong_vals = [r["grade_counts"].wrong for r in runs]

        fig, ax = S.new_figure(figsize=(max(8, len(runs) * 2.5), 6))

        x = np.arange(len(labels))
        width = 0.25
        bars_c = ax.bar(
            x - width, correct_vals, width,
            color=series_colors[0], edgecolor=S.HATCH_COLOR,
            linewidth=S.BAR_EDGE_WIDTH, hatch=series_hatches[0], label="Correct",
        )
        bars_p = ax.bar(
            x, partial_vals, width,
            color=series_colors[1], edgecolor=S.HATCH_COLOR,
            linewidth=S.BAR_EDGE_WIDTH, hatch=series_hatches[1], label="Partial",
        )
        bars_w = ax.bar(
            x + width, wrong_vals, width,
            color=series_colors[2], edgecolor=S.HATCH_COLOR,
            linewidth=S.BAR_EDGE_WIDTH, hatch=series_hatches[2], label="Wrong",
        )

        for bars, vals in [(bars_c, correct_vals), (bars_p, partial_vals), (bars_w, wrong_vals)]:
            total = runs[0]["grade_counts"].total  # annotate with raw count
            S.annotate_bars(ax, bars, vals)

        ax.set_xticks(x)
        ax.set_xticklabels(labels)
        S.style_ax(ax, title="Accuracy Comparison", ylabel="Count")

        handles = [
            Patch(facecolor=series_colors[i], hatch=series_hatches[i],
                  edgecolor=S.HATCH_COLOR, linewidth=S.BAR_EDGE_WIDTH,
                  label=categories[i])
            for i in range(3)
        ]
        S.add_legend(ax, handles=handles)

    buf = io.BytesIO()
    S.save(fig, buf, format="png")
    import matplotlib.pyplot as plt
    plt.close(fig)
    buf.seek(0)
    return buf.getvalue()
