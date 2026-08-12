ARG PYTHON_BASE_IMAGE=swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/library/python:3.9-slim
FROM ${PYTHON_BASE_IMAGE}

WORKDIR /app

COPY index.html ./
COPY css/ ./css/
COPY js/ ./js/
COPY assets/ ./assets/
COPY server.py ./

EXPOSE 8765

ENV PORT=8765
ENV HOST=0.0.0.0

CMD ["python3", "server.py"]
