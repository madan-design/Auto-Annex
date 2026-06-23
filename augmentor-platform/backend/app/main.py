from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.routes import annotation_labels
from app.routes import annotation, mask, augmentation, training, inference

from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from fastapi import Request


# ---------------------------------------------------
# Create FastAPI App
# ---------------------------------------------------

app = FastAPI(

    title="Augmentor Detection Platform",

    description="Backend API for annotation, mask generation, augmentation, training and inference.",

    version="1.0.0"

)


# ---------------------------------------------------
# VALIDATION ERROR FIX
# ---------------------------------------------------

@app.exception_handler(RequestValidationError)

async def validation_exception_handler(

request: Request,

exc: RequestValidationError

):

    cleaned_errors = []

    for err in exc.errors():

        err_copy = err.copy()

        if "input" in err_copy and isinstance(

            err_copy["input"],

            (bytes, bytearray)

        ):

            err_copy["input"] = "<binary data>"

        cleaned_errors.append(err_copy)

    return JSONResponse(

        status_code=422,

        content={"detail": cleaned_errors}

    )



# ---------------------------------------------------
# CORS
# ---------------------------------------------------

app.add_middleware(

    CORSMiddleware,

    allow_origins=[

        "http://localhost:5173",

        "http://127.0.0.1:5173"

    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],

)


# ---------------------------------------------------
# ROOT
# ---------------------------------------------------

@app.get("/")

def root():

    return {

        "message":

        "🚀 Augmentor Detection Platform Backend Running",

        "docs":"/docs"

    }



# ---------------------------------------------------
# HEALTH
# ---------------------------------------------------

@app.get("/health")

def health_check():

    return JSONResponse(

        status_code=200,

        content={"status":"healthy"}

    )



# ---------------------------------------------------
# ROUTERS
# ---------------------------------------------------

app.include_router(

    annotation.router,

    prefix="/annotation",

    tags=["Annotation"]

)

app.include_router(

    mask.router,

    prefix="/mask",

    tags=["Mask"]

)

app.include_router(

    augmentation.router,

    prefix="/augment",

    tags=["Augmentation"]

)

app.include_router(

    training.router,

    prefix="/train",

    tags=["Training"]

)

app.include_router(

    inference.router,

    prefix="/detect",

    tags=["Inference"]

)



# ---------------------------------------------------
# STARTUP
# ---------------------------------------------------

@app.on_event("startup")

def startup_event():

    print(

        "🚀 Backend Perfectly Started"

    )



# ---------------------------------------------------
# SHUTDOWN
# ---------------------------------------------------

@app.on_event("shutdown")

def shutdown_event():

    print(

        "🛑 Backend shutting down"

    )


# ---------------------------------------------------
# STATIC FILES
# ---------------------------------------------------

app.mount(
    "/augment/output",
    StaticFiles(directory="augmented_output"),
    name="augment_output"
)

app.mount(
    "/detect/result",
    StaticFiles(directory="detect_results"),
    name="detect_result"
)