

from utils import *


# --------------------------------------------------
# 1. Define Sudoku units
# --------------------------------------------------

row_units = [cross(r, cols) for r in rows]
column_units = [cross(rows, c) for c in cols]
square_units = [
    cross(rs, cs)
    for rs in ('ABC', 'DEF', 'GHI')
    for cs in ('123', '456', '789')
]

# Main diagonals:
# A1, B2, C3, ..., I9
# A9, B8, C7, ..., I1
diagonal_units = [
    [rows[i] + cols[i] for i in range(9)],
    [rows[i] + cols[8 - i] for i in range(9)]
]

# Include diagonal units along with normal Sudoku units.
unitlist = row_units + column_units + square_units + diagonal_units

# Create unit and peer mappings after all units are defined.
units = extract_units(unitlist, boxes)
peers = extract_peers(units, boxes)


# --------------------------------------------------
# 2. Naked Twins strategy
# --------------------------------------------------

def naked_twins(values):
    """Eliminate naked twin candidates from other boxes in a unit."""

    # Keep the original candidates so every twin pair is identified
    # from the same starting state.
    original = values.copy()

    for unit in unitlist:
        candidate_groups = {}

        for box in unit:
            candidates = original[box]

            if len(candidates) == 2:
                candidate_groups.setdefault(candidates, []).append(box)

        # Only two boxes with the same two candidates form a twin pair.
        for candidates, twin_boxes in candidate_groups.items():
            if len(twin_boxes) != 2:
                continue

            twin1, twin2 = twin_boxes

            for box in unit:
                if box != twin1 and box != twin2:
                    for digit in candidates:
                        values[box] = values[box].replace(digit, "")

    return values


# --------------------------------------------------
# 3. Eliminate strategy
# --------------------------------------------------

def eliminate(values):
    """Remove solved digits from the peers of each solved box."""

    solved_values = [
        (box, values[box])
        for box in boxes
        if len(values[box]) == 1
    ]

    for box, digit in solved_values:
        for peer in peers[box]:
            values[peer] = values[peer].replace(digit, "")

    return values


# --------------------------------------------------
# 4. Only Choice strategy
# --------------------------------------------------

def only_choice(values):
    """Assign a digit when it can appear in only one box in a unit."""

    for unit in unitlist:
        for digit in cols:
            places = [
                box for box in unit
                if digit in values[box]
            ]

            if len(places) == 1:
                values[places[0]] = digit

    return values


# --------------------------------------------------
# 5. Constraint propagation
# --------------------------------------------------

def reduce_puzzle(values):
    """Apply constraint strategies until no further progress is made."""

    while True:
        # Count solved boxes before applying the strategies.
        solved_before = sum(
            len(values[box]) == 1
            for box in boxes
        )

        eliminate(values)
        only_choice(values)
        naked_twins(values)

        # An empty candidate string indicates a contradiction.
        if any(len(values[box]) == 0 for box in boxes):
            return False

        # Every digit must remain possible in each unit.
        for unit in unitlist:
            for digit in cols:
                if not any(digit in values[box] for box in unit):
                    return False

        solved_after = sum(
            len(values[box]) == 1
            for box in boxes
        )

        # Stop when no additional boxes have been solved.
        if solved_before == solved_after:
            break

    return values


# --------------------------------------------------
# 6. Depth-first search
# --------------------------------------------------

def search(values):
    """Solve Sudoku using constraint propagation and backtracking."""

    values = reduce_puzzle(values)

    if values is False:
        return False

    # If every box has one digit, the puzzle is solved.
    if all(len(values[box]) == 1 for box in boxes):
        return values

    # Choose the unsolved box with the fewest candidates.
    unsolved = [
        (len(values[box]), box)
        for box in boxes
        if len(values[box]) > 1
    ]

    _, box = min(unsolved)

    # Try each candidate independently.
    for digit in values[box]:
        new_values = values.copy()
        new_values[box] = digit

        result = search(new_values)

        if result is not False:
            return result

    return False


# --------------------------------------------------
# 7. Solve function
# --------------------------------------------------

def solve(grid):
    """Solve a diagonal Sudoku grid and return its values dictionary."""

    values = grid2values(grid)
    return search(values)


# --------------------------------------------------
# 8. Run the example puzzle
# --------------------------------------------------

if __name__ == "__main__":
    diag_sudoku_grid = (
        '2.............62....1....7...6..8...3...9...7...6..4...'
        '4....8....52.............3'
    )

    display(grid2values(diag_sudoku_grid))

    result = solve(diag_sudoku_grid)
    display(result)

    if result:
        try:
            import PySudoku
            PySudoku.play(grid2values(diag_sudoku_grid), result, history)
        except SystemExit:
            pass
        except Exception:
            print(
                "The Sudoku visualization could not be opened. "
                "This does not affect the solver."
            )
