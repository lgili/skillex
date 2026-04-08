# Visual Explanation Patterns

Use non-text elements when they reduce reading time or improve technical clarity.

## Use a Table When

- comparing options
- listing requirements
- summarizing test results
- showing parameter values
- mapping risks to mitigations
- aligning assumptions and limits

Good table candidates:

- requirement matrix
- parameter list
- result summary
- component comparison
- risk register

## Use a Figure When

- explaining architecture
- showing a setup
- annotating a board, device, or system
- illustrating a process or flow
- pointing to a failure location

Good figure candidates:

- block diagram
- wiring/setup image
- annotated photo
- architecture diagram
- timeline graphic

## Use a Chart When

- showing trends over time
- comparing curves
- showing distributions
- visualizing transients or frequency behavior
- showing performance across conditions

Good chart candidates:

- efficiency curve
- temperature trend
- load-step waveform
- histogram
- bar chart for category comparison

## Use an Equation When

- the report depends on a model
- a budget or estimate is derived
- assumptions must be explicit
- a variable relationship matters more than prose

Bad reasons to add an equation:

- decoration
- formality theater
- repeating a simple statement that a table already shows

## Caption Pattern

Every important visual should answer:

1. What the reader is seeing
2. Under what condition
3. What technical point matters

Weak caption:

`Results plot.`

Stronger caption:

`Efficiency versus output current at 12 V input. Peak efficiency occurred near 1.8 A, while the drop above 2.4 A indicates increasing conduction loss.`

## Visual Placement Rule

Place the visual close to the claim it supports. Do not force the reader to flip
through the document to understand one paragraph.
