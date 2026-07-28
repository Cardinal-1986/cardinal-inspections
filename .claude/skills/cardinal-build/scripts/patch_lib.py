"""Exact-match patch helpers for the Cardinal build workflow.

Literal string splicing ONLY. sub() never expands regex backreferences —
passing '\\1' writes a literal backslash-one into the file (build 302 lesson).
Use re.sub yourself when you genuinely need backrefs, then still verify the
result with assert_in / count checks.

Typical use:

    import patch_lib as pl
    src = pl.load('index_v332.html')
    src = pl.sub(src, OLD, NEW)              # asserts exactly 1 occurrence
    src = pl.sub(src, OLD2, NEW2, count=3)   # explicit expected count
    pl.write_atomic('index_v333.html', src)
    pl.assert_in('index_v333.html', NEW)     # assert on the artifact you wrote
"""

import os
import tempfile


class PatchError(AssertionError):
    """Raised when an exact-match precondition fails. Nothing is written."""


def load(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def context(src, needle, before=100, after=100, occurrence=0):
    """Print repr() of the text around `needle` so anchors can be written
    against REAL whitespace. Module code is newline-separated — a
    space-for-newline mismatch aborts the patch and costs a round.

    Prints every occurrence count first, then the repr of the requested one.
    Returns the repr string (or None if not found).
    """
    n = src.count(needle)
    print(f"occurrences of {needle[:60]!r}: {n}")
    if n == 0:
        return None
    i = -1
    for _ in range(occurrence + 1):
        i = src.find(needle, i + 1)
    r = repr(src[max(0, i - before): i + len(needle) + after])
    print(r)
    return r


def sub(src, old, new, count=1):
    """Replace `old` with `new` after asserting it occurs exactly `count` times.

    Aborts (raises PatchError) on any mismatch, BEFORE any write can happen.
    Literal strings only — no regex, no backreference expansion.
    """
    n = src.count(old)
    if n != count:
        raise PatchError(
            f"expected {count} occurrence(s), found {n}: {old[:120]!r}"
        )
    return src.replace(old, new)


def write_atomic(path, data):
    """Write via temp-file-then-rename in the destination directory.

    A crash mid-write can never truncate or corrupt the destination file.
    """
    d = os.path.dirname(os.path.abspath(path)) or "."
    fd, tmp = tempfile.mkstemp(dir=d, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(data)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def assert_in(path, marker, label="marker"):
    """Assert the artifact on disk actually contains `marker`.

    Check the file you just wrote — not that the patch script 'ran'.
    """
    if marker not in load(path):
        raise PatchError(f"{label} missing from artifact {path}: {marker[:120]!r}")


def assert_not_in(path, marker, label="negative control"):
    """Negative control: assert `marker` is ABSENT from `path` (usually the
    previous build). A gate that has never been seen to fail proves nothing."""
    if marker in load(path):
        raise PatchError(
            f"{label} failed — marker already present in {path}: {marker[:120]!r}"
        )
