# Clone Bulk

Bulk clone things from WW prod, via SSH tunnel through bastion host, to local `dr` database

### To install:

1.  `yarn install`

2.  Add hosts `clonerow-tunnel` and `groundskeeperwilly` in your `~/.ssh/config` if not already present like so:

```
Host groundskeeperwilly
    HostName groundskeeperwilly.wherewolf.co.nz
    User ubuntu
    IdentityFile ~/.ssh/THE_KEY_FILE_YOU_USE_TO_ACCESS_GROUNDSKEEPERWILLY

Host clonerow-tunnel
    HostName  groundskeeperwilly.wherewolf.co.nz
    ControlMaster auto
    ControlPath ~/.ssh/clonerow-tunnel.sock
    ExitOnForwardFailure yes
    AddressFamily inet
    User ubuntu
    IdentityFile ~/.ssh/THE_KEY_FILE_YOU_USE_TO_ACCESS_GROUNDSKEEPERWILLY
```

Confirm you are able to connect to groundskeeperwilly with `ssh groundskeeperwilly`

3.  Add an `/etc/hosts` override allowing you to access local docker container by the hostname used in `wherewolf-backend/config/env/development.js`

```
127.0.0.1       test-redis test_redis test-postgres test_postgres wherewolf_docker_postgres redis
```

If you're running Windows WSL2, your /etc/hosts file is probably recreated every time you reboot your machine, so just add this to your C:\Windows\system32\drivers\etc\hosts

### To run:

You must have `dr` running (as your destination database)

`yarn start`
