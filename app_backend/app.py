from elasticsearch                    import Elasticsearch
from flask                            import Flask, request
from flask_cors                       import CORS
from json                             import dumps
from langchain.chains                 import RetrievalQA
from langchain.embeddings.huggingface import HuggingFaceEmbeddings
from langchain_elasticsearch          import ElasticsearchStore
from langchain_openai                 import ChatOpenAI
from os                               import getenv
from urllib3                          import disable_warnings

disable_warnings()

ELASTICSEARCH_HOST     = getenv('ELASTICSEARCH_HOST')
ELASTICSEARCH_USER     = getenv('ELASTICSEARCH_USER')
ELASTICSEARCH_PASSWORD = getenv('ELASTICSEARCH_PASSWORD')
ELASTICSEARCH_INDEX    = getenv('ELASTICSEARCH_INDEX')
LLM_API_BASE           = getenv('LLM_API_BASE')
LLM_API_KEY            = getenv('LLM_API_KEY')
LLM_MODEL_NAME         = getenv('LLM_MODEL_NAME')
LLM_VISION_API_BASE    = getenv('LLM_VISION_API_BASE')
LLM_VISION_API_KEY     = getenv('LLM_VISION_API_KEY')
LLM_VISION_MODEL_NAME  = getenv('LLM_VISION_MODEL_NAME')

embedding = HuggingFaceEmbeddings(
    model_name   = 'nomic-ai/nomic-embed-text-v1',
    model_kwargs = {
        'trust_remote_code' : True
    }
)

es_connection = Elasticsearch(
    hosts        = ELASTICSEARCH_HOST,
    basic_auth   = (ELASTICSEARCH_USER, ELASTICSEARCH_PASSWORD),
    verify_certs = False
)

es_store = ElasticsearchStore(
    es_connection = es_connection,
    index_name    = ELASTICSEARCH_INDEX,
    embedding     = embedding
)

llm = ChatOpenAI(
    openai_api_base = f'{LLM_API_BASE}/v1',
    openai_api_key  = LLM_API_KEY,
    model_name      = LLM_MODEL_NAME
)

qa = RetrievalQA.from_llm(
    llm                     = llm,
    retriever               = es_store.as_retriever(),
    return_source_documents = True
)

llm_vision = ChatOpenAI(
    openai_api_base = f'{LLM_VISION_API_BASE}/v1',
    openai_api_key  = LLM_VISION_API_KEY,
    model_name      = LLM_VISION_MODEL_NAME
)

app = Flask(__name__)
CORS(app)


@app.route('/', methods = ['POST'])
def handle_message() -> str:

    message = request.json['message']

    params = {
        'query' : message
    }

    qa_response = qa.invoke(params)

    sources = [{
        'text' : source_document.metadata.source
        'metadata' : {
            'source' : 'https://redhat.com'
        }
    } for source_document in qa_response['source_documents']]

    text = qa_response['result']

    return f'{dumps(sources)}{text}'

