## 2024-05-19 - Parallelizing R2 storage persistence and document extraction for chat attachments
**Learning:** Sequential `for...of` loops performing HTTP requests to remote storage and heavy CPU-bound tasks like document extraction block user perception of finished state.
**Action:** Use `Promise.all` alongside `.map` to process array elements in parallel when dealing with bulk I/O operations and asynchronous processing.
