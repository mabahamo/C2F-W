FROM alpine:3.19 as base
RUN apk add --no-cache build-base eigen-dev boost-dev tiff-dev aws-cli
COPY Cell2Fire /usr/local/Cell2Fire
WORKDIR /usr/local/Cell2Fire
RUN make clean -f makefile.alpine
RUN make install -f makefile.alpine

COPY aws/wrapper.sh /usr/local/bin/Cell2FireWrapper
RUN chmod +x /usr/local/bin/Cell2FireWrapper

ENTRYPOINT ["/usr/local/bin/Cell2FireWrapper"]
