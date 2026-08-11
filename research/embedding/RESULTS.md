# Meaning similarity system
## Results
- `informative` technique resulted in best similarity across the same objects but spelled differently
- `explicit` technique resulted in lowest similarity between entities that reffer to different objects but are spelled similarily
- `minimal` technique is like golden center between `informative` and `explicit`

## Decision
Best embedding technique for our case is 'informative'.

## Why?
For indirect deduping we will not rely strictly on embedding approach. We will be using also llm arbiter for this.
For that reason we don't want to miss a single possible call. Because of that we prioritize:
`the biggest similarity between same object spelled differently`, which `informative` technique offers

# Graph search system
!! Not reseaarched yet !!