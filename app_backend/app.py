from elasticsearch                  import Elasticsearch
from flask                          import Flask, request
from flask_cors                     import CORS
from json                           import dumps
from langchain.chains               import RetrievalQA
from langchain.prompts              import PromptTemplate
from langchain_core.messages        import HumanMessage
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_elasticsearch        import ElasticsearchStore
from langchain_openai               import ChatOpenAI
from os                             import getenv
from urllib3                        import disable_warnings

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

template = '''
Você é um assistente para tarefas de resposta a perguntas especialista em infrações ambientais.
Use o contexto para responder à pergunta.
Se você não sabe a resposta, apenas diga que não sabe.
Pergunta: {question}
Contexto: {context}
Resposta:
'''

prompt = PromptTemplate.from_template(template)

qa = RetrievalQA.from_chain_type(
    llm                     = llm,
    retriever               = es_store.as_retriever(),
    return_source_documents = True,
    chain_type_kwargs       = {
        'prompt' : prompt
    }
)

llm_vision = ChatOpenAI(
    openai_api_base = f'{LLM_VISION_API_BASE}/v1',
    openai_api_key  = LLM_VISION_API_KEY,
    model_name      = LLM_VISION_MODEL_NAME
)

app = Flask(__name__)
CORS(app)


@app.route('/', methods = ['POST'])
def handle_message():

    print(request.json)

    message = request.json['message']
    image   = request.json['image']

    image_context = ''

    if len(image) > 0:

        vision_response = llm_vision.invoke(
            [
                HumanMessage(
                    content = [
                        {
                            'type' : 'text',
                            'text' : '''Você é um assistente especializado em Legislação Ambiental.
                            Seu objetivo é extrair informações de uma imagem, contendo informações de processos ambientais,
                            danos ambientais, incêndios e animais.
                            Em até 200 palavras, faça uma descrição da imagem, em PORTUGUÊS.
                            Se a imagem não conter informações de danos ambientes, responda que você não entende outro contexto!'''
                        },
                        {
                            'type'      : 'image_url',
                            'image_url' : {
                                'url' : image
                            }
                        }
                    ]
                )
            ]
        )

        image_context = vision_response.content

    params = {
        'query' : message
    }

    if image_context:
        params['query'] = f'{message} IMAGEM: {image_context}'

    qa_response = qa.invoke(params)

    qa_response_sources = [{
        'text' : source_document.metadata['source'],
        'metadata' : {
            'source' : 'https://redhat.com'
        }
    } for source_document in qa_response['source_documents']]

    sources = []
    for source in qa_response_sources:
        util = [s['text'] for s in sources]
        if source['text'] not in util:
            sources.append(source)

    text = qa_response['result']

    return f'START_SOURCES_STRING{dumps(sources)}END_SOURCES_STRING{text}'
