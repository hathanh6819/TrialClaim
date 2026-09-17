# Studio Next adversarial live evidence

Run date: 2026-09-17  
Network: Studio Next (chain ID 61997)  
Contract: `0xB5fE310B807d99668617790C93f965ed90886aea`

The matrix used two independent test wallets. Private keys were entered through hidden TTY prompts and were not stored.

## Results

| Scenario | Result | Transaction |
| --- | --- | --- |
| Assess a superseded claim | Rolled back; claim state unchanged | `0x6a64e9cf5628301802185a777ff5c3f84f81010e2df37e63fe0afccb44600317` |
| Path-traversal-shaped NCT identity | Rolled back; claim count unchanged | `0xc99f84b2d1b0ebcf4f1351ef16fba1cbffc0ee2792fc2ae8560ecaeca0d5c6f7` |
| Register contradictory endpoint claim | Claim 3 appended | `0x55bb8fa77300a2105be9b83ba704e8d3650d799c223a78dfb968da9a8d71f6b5` |
| Assess contradictory endpoint claim | `MISALIGNED`; citation remained bound to `Time to Recovery` | `0xa9cc687a53ab1485fe2b74a42af2e990167234830d17e914b14d87faa9bbcc29` |
| Repeat contradictory assessment | Attempt 2 appended; attempt 1 unchanged; still `MISALIGNED` | `0xaff6ff0a3a644b5f15cdd31a5975cc7fce31386e1abee791b0c6ae18fde47db1` |
| Register unsupported efficacy claim | Claim 4 appended | `0x8a188c30b27a5ff7fb101035d24a8512c570d0446914d2d286a99554f839f449` |
| Assess unsupported efficacy claim | `INCONCLUSIVE`, never `ALIGNED` | `0xcd9221f1f78ba6f9e575b3f04b27a044937c03abc554094af9520b9d2e909bae` |
| Register missing authority record | Claim 5 appended | `0x3e5081aaab587a1a9098570c4523ddc1572a1c42841b2ae089de3f7c817e5f29` |
| Assess missing authority record | `INCONCLUSIVE`; `SOURCE_UNAVAILABLE_OR_MALFORMED` | `0x688988c69f65809651b7d7aac8a6dc85d636013aa387079cbd095e1d023a45da` |

## Security properties demonstrated

- Validator-side authority fetching is used; callers do not submit their own evidence document.
- Invalid identifiers and invalid lifecycle transitions fail without mutating state.
- Contradictory content cannot obtain `ALIGNED` merely by naming a valid study.
- Reassessment is append-only and cannot overwrite earlier evidence history.
- Vague marketing claims and unavailable authority records fail closed.
- Assessment remains permissionless while claim ownership and supersession are role-bound.

This evidence complements the positive two-wallet lifecycle in `LIVE_EVIDENCE.md`.
