# Background removal and cost safeguards

Uploads perform Claude inventory analysis only. No FASHN image generation is submitted automatically, including from older clients calling extract/clean. Studio cutouts are opt-in, processed locally with @imgly/background-removal, and saved as transparent PNG. Model assets download on first use (roughly 80 MB); CPU inference can be slow on phones. Photos are not sent to IMG.LY for inference.

This removes the background of standalone garment photographs. It does not reconstruct hidden fabric, remove a wearer, iron wrinkles, or guarantee perfect edges. Worn-item detections remain reviewable crops, explicitly requiring a standalone photo for free background removal. Legacy records can be marked standalone in the editor. Review before saving.

The testing account santiagogomez3186@gmail.com is exempt from the application daily request quota after server-side authentication. Other accounts retain the quota. Provider balances and limits still apply. No paid calls were made to verify this change.

Look selection replaces conflicting garment slots in the client and rejects conflicts server-side before submitting paid requests. A dress conflicts with tops and trousers; accessories use semantic slots such as hat, watch, belt and glasses.

## Open-source notice

Background removal uses IMG.LY's AGPL-3.0 licensed package, with license supplied in node_modules/@imgly/background-removal/LICENSE.md. Upstream source: https://github.com/imgly/background-removal-js . Application source: https://github.com/santiagoGM2/Vesti . Reassess distribution/license obligations before commercial distribution.
