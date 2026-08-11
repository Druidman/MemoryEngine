# We need to know how to embedd entities for two types of operations:
- graph search
- meaning similarity

## Graph search
Embeddings should be optimized for queries like: "what programming languages does user like?"
System: `formatting X -> [similarity] <- formatting Y (query)`, `same to different` relationship

## Meaning search
Embeddings should be optimized for not queries but direct similarity checks.
System: `formatting X -> [similarity] <- formatting X`, `same to same` relationship

# Why even bother doing two systems?
Ummm..... Because we want to make best engine in the world?? Duhh xD