from elasticsearch                import Elasticsearch
from flask                        import Flask, request
from langchain.chains             import RetrievalQA
from langchain_elasticsearch      import ElasticsearchStore
from langchain_openai             import ChatOpenAI
from os                           import getenv
from sentence_transformers        import SentenceTransformer
from urllib3                      import disable_warnings

disable_warnings()

ELASTICSEARCH_HOST     = getenv('ELASTICSEARCH_HOST')
ELASTICSEARCH_USER     = getenv('ELASTICSEARCH_USER')
ELASTICSEARCH_PASSWORD = getenv('ELASTICSEARCH_PASSWORD')
ELASTICSEARCH_INDEX    = getenv('ELASTICSEARCH_INDEX')
LLM_API_BASE           = getenv('LLM_API_BASE')
LLM_API_KEY            = getenv('LLM_API_KEY')
LLM_MODEL_NAME         = getenv('LLM_MODEL_NAME')

embedding = SentenceTransformer('all-MiniLM-L6-v2')

elasticsearch_connection = Elasticsearch(
    hosts        = ELASTICSEARCH_HOST,
    basic_auth   = (ELASTICSEARCH_USER, ELASTICSEARCH_PASSWORD),
    verify_certs = False
)

elasticsearch_store = ElasticsearchStore(
    es_connection = elasticsearch_connection,
    index_name    = ELASTICSEARCH_INDEX,
    embedding     = embedding
)

llm = ChatOpenAI(
    openai_api_base = f'{LLM_API_BASE}/v1',
    openai_api_key  = LLM_API_KEY,
    model_name      = LLM_MODEL_NAME
)

qa = RetrievalQA.from_llm(
    llm       = llm,
    retriever = elasticsearch_store.as_retriever()
)

app = Flask(__name__)


@app.route('/', methods = ['GET', 'POST'])
def handle_message() -> dict:

    return {
        'status' : 'ok'
    }
