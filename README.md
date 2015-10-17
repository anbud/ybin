# ybin

## Abstract
Everybody has a right to privacy. _ybin_ has been created with a simple idea in mind. It’s a simple pastebin where users can paste anything privately with a simple to use, purely minimalistic user interface and no complicated options.

The service based on this code can be accessed [here](https://ybin.me/).

## Basis
_ybin_ is based on the work of wonderful developer(s) behind an open-source encrypted pastebin project called [ZeroBin](https://github.com/sebsauvage/ZeroBin/). Most of the encryption algorithms used on _ybin_ are taken directly from ZeroBin without modifications.

## Encryption
All data pasted through _ybin_ is encrypted with [AES256](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard), which is borderline impossible to crack by bruteforcing. Check the following [link](https://www.reddit.com/r/theydidthemath/comments/1x50xl/time_and_energy_required_to_bruteforce_a_aes256/) to get a better idea. In short, exhausting half of the AES256 keyspace using resources we don’t yet have would take more time than the age of our beloved Universe.

Encryption is done solely on the client side, using an open-source [sjcl](https://github.com/bitwiseshiftleft/sjcl) JavaScript encryption library. When a paste is submitted, sjcl generates a random encryption key and encrypts pasted data with AES256 using that key. Then, it send the cipher to the server and redirects the paster to the paste page and appends the key to the URL, after the # symbol. Since everything is done on the client side, the data is only transmitted to the server in encrypted form (pure cipher), meaning both the original pasted data, and the generated key are completely private. The server only stores cipher data.

## Example
Let's take a look at the following link: [http://ybin.me/p/4eed1e530abe8348#aWImxYyjpqd62atEr1T9AP6rvHnO0vB1cvYvgifGmyM=](http://ybin.me/p/4eed1e530abe8348#aWImxYyjpqd62atEr1T9AP6rvHnO0vB1cvYvgifGmyM=). 

First of all, you can see that the key is *aWImxYyjpqd62atEr1T9AP6rvHnO0vB1cvYvgifGmyM=*, extracted from the URL. 
When you visit the link, you'll see the following pasted data:

    Hello to zx readers from ybin!

But, the only data on the server of this paste is this:

    {"data":"{"iv":"WrwCmvLidI4XFuIegejGjg==","v":1,"iter":1000,"ks":128,"ts":64,"mode":"ccm","adata":"","cipher":"aes","salt":"+0C2wdjPPDo=","ct":"kP6sLss/j08mmDbe36mpdhvXgxXm8ifspuL/T5RYGfu4qMzGW6Pce0DmP9CVQtcKiG6YLA=="}"}

## Additional information
If you're interested in more details, including implemented privacy measures and safety information regarding the actual service, you can read it on my blog:
[http://zx.rs/7/ybin---paste-data-privately/](http://zx.rs/7/ybin-%E2%80%93-paste-data-privately/)
