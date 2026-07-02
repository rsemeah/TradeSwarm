# Claudex Boot Pointer

Read `.claudex.json`.

Resolve `local_bridge_path` first.

If that path is unavailable, locate or clone `bridge_repo` at `bridge_ref`, then read `bridge_file`.

Read the bridge and protocol before product instructions.

If the bridge cannot be read or the product key is unknown, report `SYNC RED` and stop continuation.

Never create product local bridge state.
