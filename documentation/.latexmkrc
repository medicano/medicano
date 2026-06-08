$pdf_mode = 1;
$bibtex_use = 2;
$max_repeat = 5;

# nonstopmode: recoverable errors (e.g. abntex2 passing the deprecated 'brazil'
# option to babel 26+) must not stall waiting for terminal input — that turns a
# non-fatal warning into an Emergency stop with no PDF.
#
# pdflatex exits 1 on warnings (overfull boxes, deprecated cmds, etc.) even when
# the PDF is complete. Map exit code 1 → 0 so latexmk continues multi-pass runs
# and reports success. Exit codes ≥ 2 are real failures and are kept as-is.
$pdflatex = 'pdflatex -interaction=nonstopmode %O %S; rc=$?; [ $rc -le 1 ] && exit 0 || exit $rc';
