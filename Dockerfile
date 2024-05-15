FROM alpine:3.19 as base
RUN apk add --no-cache build-base eigen-dev boost-dev tiff-dev aws-cli
RUN apk add nodejs npm
RUN npm install --global yarn
COPY Cell2Fire /usr/local/Cell2Fire
WORKDIR /usr/local/Cell2Fire
RUN make clean -f makefile.alpine
RUN make install -f makefile.alpine

COPY aws /usr/local/Cell2FireWrapper
WORKDIR /usr/local/Cell2FireWrapper
RUN yarn && yarn build

ENTRYPOINT ["node", "/usr/local/Cell2FireWrapper/build/wrapper"]
