FROM python:3.9-slim

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
