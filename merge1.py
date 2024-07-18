from fastapi import FastAPI, Form
from fastapi.middleware.cors import CORSMiddleware
from ibm_watsonx_ai.foundation_models import Model
from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams
from ibm_watsonx_ai.foundation_models.utils.enums import DecodingMethods
from ibm_watsonx_ai import APIClient, Credentials

app = FastAPI()

# Allow CORS for all origins (change this to your frontend's URL in a production environment)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# IBM Watson credentials
credentials = Credentials(
    url="https://us-south.ml.cloud.ibm.com",
    api_key="mEceKrGw1L1HjMO7psz_naOqg2fn0Wx_z14reSW8Z_fO"  # Replace with your IBM Cloud key
)
client = APIClient(credentials)

def get_model(model_type, max_tokens, min_tokens, decoding, temperature):
    generate_params = {
        GenParams.MAX_NEW_TOKENS: max_tokens,
        GenParams.MIN_NEW_TOKENS: min_tokens,
        GenParams.DECODING_METHOD: decoding,
        GenParams.TEMPERATURE: temperature,
    }
    model = Model(model_id=model_type, params=generate_params, credentials=credentials, project_id="6bde8a1d-2c86-4907-8c0c-1fc148bfcd9f")
    return model

model_type = "meta-llama/llama-2-70b-chat"
max_tokens = 500
min_tokens = 100
decoding = DecodingMethods.GREEDY
temperature = 0.9

prompt_ques = "Using the description enclosed in <<>>, only suggest a list of 5 specific questions in json format {Questions:[Q1,Q2,..]} -<< "
prompt_pre = """Using the description enclosed in <<>>- give prescription mentioning the medicines and dosage. Only give me response in the following json format once. {
    name:
    disease:
    medicine: [
    {name:
        dosage:}, ...]
    Homeremedy:
    comments:
} <<"""

@app.post("/submit/")
async def handle_form(prompt: str = Form(...)):
    model = get_model(model_type, max_tokens, min_tokens, decoding, temperature)
    prompt = prompt_ques + prompt + ">>"
    print(prompt)
    generated_response = model.generate(prompt)
    response_text = generated_response['results'][0]["generated_text"]
    outp = response_text[response_text.index('{'): response_text.rindex('}') + 1]
    print(outp)
    return {"response": outp}

@app.post("/prescription/")
async def handle_prescription(prompt: str = Form(...)):
    model = get_model(model_type, max_tokens, min_tokens, decoding, temperature)
    prompt = prompt_pre + prompt + ">>"
    print(prompt)
    generated_response = model.generate(prompt)
    response_text = generated_response["results"][0]["generated_text"]
    outp2 = response_text[response_text.index('{'): response_text.rindex('}') + 1]
    return {"response": outp2}

#######
###python3 -m pip install fastapi
## do pip install for other libraries too
### pip install hypercorn 
### to run code -  hypercorn merge1:app --reload