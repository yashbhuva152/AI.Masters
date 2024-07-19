from fastapi import FastAPI, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from ibm_watsonx_ai.foundation_models import Model
from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams
from ibm_watsonx_ai.foundation_models.utils.enums import DecodingMethods
from ibm_watsonx_ai import APIClient, Credentials
import json
import os

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

prompt_ques = """Assume You are a medical assistant and a patient is giving inputs. User inputs will be enclosed in <<>>.
Provide emapathic message and suggest a list of 5 specific questions in json format.
Only give me response in the following json format once. {EmpathyMessage, Questions:[Q1,Q2,..]}
<<"""
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
    outp = response_text[response_text.index('{'): response_text.index('}') + 1]
    #outp = json.loads(outp)
    print(outp)
    return {"response": outp}

@app.post("/prescription/")
async def handle_prescription(prompt: str = Form(...)):
    model = get_model(model_type, max_tokens, min_tokens, decoding, temperature)
   
    relative_path = 'Resource/chat-log.txt'

    # Get the absolute path to the file
    file_path = os.path.join(os.path.dirname(__file__), relative_path)
        # Read the file
    try:
        with open(file_path, 'r') as file:
            content = file.read()
    except FileNotFoundError:
        print(f"The file at {file_path} does not exist.")
    except Exception as e:
        print(f"An error occurred: {e}")
    prompt = prompt_pre + content + prompt + ">>"
    print(prompt)
    generated_response = model.generate(prompt)
    response_text = generated_response["results"][0]["generated_text"]
    outp2 = response_text[response_text.index('{'): response_text.rindex('}') + 1]
    outp2 = json.loads(outp2)

    print(outp2)
    return {"response": outp2}

@app.post("/log-message/")
async def log_message(request: Request):
    data = await request.json()
    user_message = data.get("userMessage")
    bot_response = data.get("botResponse")
    
    with open("chat_log.txt", "a") as log_file:
        log_file.write(f"User: {user_message}\n")
        log_file.write(f"Bot: {bot_response}\n\n")
    
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

#######
###python3 -m pip install fastapi
## do pip install for other libraries too
### pip install hypercorn 
### to run code - python -m hypercorn backendServer:app --reload