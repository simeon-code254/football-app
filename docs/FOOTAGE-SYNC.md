# Getting contributor footage into Colab

Contributors upload to Azure Blob (`raw/`). Training happens in Colab. This
moves footage from one to the other.

## Why via Drive rather than straight from Azure

Colab can read Azure directly, but it pays egress **every session** — roughly
$0.087/GB out of Spain Central after the first 100GB/month free. Training reads
the same footage many times, so that bill repeats.

Drive mounts into Colab as a filesystem and reads are free. So the trade is:
pay egress **once** to get footage into Drive, then read it for nothing forever
after. At any real training volume that wins easily.

The corollary: don't sync footage you aren't going to train on yet. Egress is
charged on the way out of Azure whether the data gets used or not.

## One-time setup

**1. Install rclone**

```powershell
winget install Rclone.Rclone
```

**2. Add the Azure container as a remote**

```powershell
rclone config
```

- `n` (new remote) → name: `matobev-raw`
- storage type: `azureblob`
- authentication: choose **SAS URL**
- SAS URL: `https://matobevdata.blob.core.windows.net/raw?<your-sas>`

Use the **Read + List** SAS (`sp=rl`), not the uploader's write SAS. Read+List
is everything a copy needs, and it means this script physically cannot delete
contributor footage even if something goes wrong.

**3. Add Drive as a remote**

```powershell
rclone config
```

- `n` → name: `matobev-drive`
- storage type: `drive`
- scope: `1` (full access)
- leave client id/secret blank
- say **yes** to the browser step and sign in as the account holding the 5TB

Credentials land in `%APPDATA%\rclone\rclone.conf`, never in this repo.

> A **service account will not work here.** Files it creates are owned by it,
> and it has no Drive storage quota of its own — the 5TB belongs to your
> account, so the transfer has to authenticate as you.

## Running it

```powershell
# see what would move, transfer nothing
.\scripts\sync-raw-to-drive.ps1 -DryRun

# do it
.\scripts\sync-raw-to-drive.ps1

# on a shared connection
.\scripts\sync-raw-to-drive.ps1 -BandwidthLimit 8M
```

It copies, then runs `rclone check --checksum` and tells you whether every
source file has a hash-identical copy in Drive. Re-running skips what is
already there, so an interrupted transfer is resumed by just running it again.

To clear Azure after a verified copy — **only** once you're happy Drive is your
archive, and only with a delete-capable SAS:

```powershell
.\scripts\sync-raw-to-drive.ps1 -MoveNotCopy
```

## Reading it in Colab

```python
from google.colab import drive
drive.mount('/content/drive')

RAW = '/content/drive/MyDrive/Matobev/raw'
```

One caveat worth knowing: the Drive FUSE mount is slow for lots of small reads.
Whole match videos are large and few, so streaming them is fine — but if you
later shard footage into thousands of frames, put the shards in Drive as
archives and copy the archive to Colab's local disk before reading:

```python
!cp "$RAW/shard-001.tar" /content/ && tar -xf /content/shard-001.tar -C /content/data
```

## Cost shape

Approximate, worth confirming against the Azure pricing calculator for Spain
Central:

| | approx |
|---|---|
| Storing 1TB in Azure for a month (Cool) | ~$10 |
| Same after the 45-day rule moves it to Cold | ~$4 |
| Copying 1TB out to Drive (one time) | ~$80 |

Deleting from Azure stops the storage meter from that moment; it does not
refund what has already been drawn. Azure for Students suspends the
subscription when credit runs out rather than billing you — which means the
uploader stops accepting footage, so that is the failure to watch for.
