# Equations and Notation

Use equations to clarify the logic, not to impress the reader.

## Equation Rules

- Introduce symbols before or immediately after the equation.
- Keep notation consistent throughout the document.
- Use SI units unless the domain requires another convention.
- Number equations when they are referenced later.
- State simplifying assumptions clearly.

## Minimum Good Pattern

Write:

`The output power is estimated as`

`P_{out} = V_{out} I_{out}`

`where V_{out} is the output voltage and I_{out} is the load current.`

Do not write a floating equation with no explanation.

## When to Prefer a Table Instead

Use a table instead of an equation when:

- the relationship is not analytical
- values are empirical only
- the reader mainly needs the numeric cases
- multiple operating points matter more than the formula

## Units and Variables

- Use one notation style per variable.
- Avoid changing between `Iload`, `I_load`, and `I_{out}` without reason.
- Keep units attached to measured values in prose and tables.
- If the same units repeat many times in a table, make them explicit in the header.

## Assumptions Block

For a derived calculation, a short assumptions block is often better than extra prose:

- input voltage fixed at nominal value
- ambient temperature at 25 C
- switching loss neglected in first-order estimate
- component tolerances excluded from this calculation

## Interpretation Rule

After an equation, explain what the result means. Equations without interpretation
often increase cognitive load instead of reducing it.
